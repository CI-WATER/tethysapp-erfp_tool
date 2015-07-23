import json
import os
from datetime import datetime, timedelta

#django imports
from django.contrib.auth.decorators import user_passes_test
from django.shortcuts import redirect, render
#from endless_pagination import utils

#tethys imports
from tethys_dataset_services.engines import GeoServerSpatialDatasetEngine

#local imports
from .model import (BaseLayer, DataStore, DataStoreType, Geoserver, MainSettings,
                    SettingsSessionMaker, Watershed, WatershedGroup)
from .functions import (format_name, format_watershed_title, 
                        user_permission_test)
from tethys_apps.sdk.gizmos import MapView, MVView, MVLayer
from tethys_apps.sdk import get_spatial_dataset_engine

def home(request):
    """
    Controller for the app home page.
    """
    #if user's last login more than two weeks or if the user is a new (2 days or less) user, set redirect variable to true
    user_not_logged_in = False #initialize exception check variable
    redirect_getting_started = False #initialize boolean
    now = datetime.now() #time that app is opened

    try: #if user not logged in, an error occurs
        last_login = request.user.last_login.replace(tzinfo=None) #time of user's last login
    except Exception:
        user_not_logged_in = True

    if user_not_logged_in:
        pass
    else:
        time_away = (now - last_login).seconds #time lapsed since last login
        if (time_away > 14):
            redirect_getting_started = True

    #get the base layer information
    session = SettingsSessionMaker()
    #Query DB for settings
    watersheds  = session.query(Watershed) \
                            .order_by(Watershed.watershed_name,
                                      Watershed.subbasin_name) \
                             .all()
    watershed_list = []
    for watershed in watersheds:
        watershed_list.append(("%s (%s)" % (watershed.watershed_name, watershed.subbasin_name),
                               watershed.id))
    watershed_groups = []
    groups  = session.query(WatershedGroup).order_by(WatershedGroup.name).all()
    session.close()
    for group in groups:
        watershed_groups.append((group.name,group.id))

    #map for selecting the NFIE regions
    geoserver_engine = get_spatial_dataset_engine(name='default')
    response = geoserver_engine.list_resources(workspace='first_responder')

    layers_to_load=[]

    if response['success']:
        resourses = response['result']

        for resourse in resourses:

            resourse_layer = MVLayer(source='ImageWMS',
                                  options={'url': 'http://127.0.0.1:8181/geoserver/wms',
                                           'params': {'LAYERS': 'sfpt:' + resourse},
                                           'serverType': 'geoserver'},
                                  legend_title=resourse,
                                  legend_extent=[-126, 24.5, -66.2, 49],
                                  )
            if resourse_layer not in layers_to_load:
                layers_to_load.append(resourse_layer)

    view_options = MVView(
            projection='EPSG:4326',
            center=[-100, 40],
            zoom=3.5,
            maxZoom=18,
            minZoom=2
            )
    select_area_map = MapView(
        height='600px',
        width='100%',
        controls=['ZoomSlider', 'Rotate', 'FullScreen',
                  {'ZoomToExtent': {'projection': 'EPSG:4326', 'extent': [-130, 22, -65, 54]}}],
        layers=layers_to_load,
        view=view_options,
        basemap='OpenStreetMap',
        )
    
    watershed_select = {
                'display_text': 'Select Watershed(s)',
                'name': 'watershed_select',
                'options': watershed_list,
                'multiple': True,
                'placeholder': 'Select Watershed(s)',
                }          
    watershed_group_select = {
                'display_text': 'Select a Watershed Group',
                'name': 'watershed_group_select',
                'options': watershed_groups,
                'placeholder': 'Select a Watershed Group',
                }          
    context = {
                'watershed_select' : watershed_select,
                'watersheds_length': len(watersheds),
                'watershed_group_select' : watershed_group_select,
                'watershed_group_length': len(groups),
                "redirect": redirect_getting_started,
                'select_area_map': select_area_map,
              }

    return render(request, 'erfp_tool/home.html', context)

def map(request):
    """
    Controller for the app map page.
    """
    if request.method == 'GET':
        #get/check information from AJAX request
        post_info = request.GET
        watershed_ids = post_info.getlist('watershed_select')
        group_id = post_info.get('watershed_group_select')
        if not watershed_ids and not group_id:
            return redirect('/apps/erfp-tool/')
        #get the base layer information
        session = SettingsSessionMaker()
        if watershed_ids:
            #Query DB for settings
            watersheds  = session.query(Watershed) \
                            .order_by(Watershed.watershed_name,
                                      Watershed.subbasin_name) \
                            .filter(Watershed.id.in_(watershed_ids)) \
                            .all()
        elif group_id:
            #Query DB for settings
            watersheds  = session.query(Watershed) \
                            .order_by(Watershed.watershed_name,
                                      Watershed.subbasin_name) \
                            .filter(Watershed.watershed_groups.any( \
                                    WatershedGroup.id == group_id)) \
                            .all()
            
        ##find all kml files to add to page    
        kml_file_location = os.path.join(os.path.dirname(os.path.realpath(__file__)),
                                         'public','kml')
        layers_info = []
        #add kml urls to list and add their navigation items as well
        group_id = 0
        for watershed in watersheds:
            ecmwf_watershed_name = watershed.ecmwf_data_store_watershed_name if \
                                   watershed.ecmwf_data_store_watershed_name else watershed.watershed_name
            ecmwf_subbasin_name = watershed.ecmwf_data_store_subbasin_name if \
                                   watershed.ecmwf_data_store_subbasin_name else watershed.subbasin_name
            #if on the local server
            if watershed.geoserver_id == 1:
                file_path = os.path.join(kml_file_location, format_name(watershed.watershed_name))
                kml_info = {'watershed' : watershed.folder_name, 
                            'subbasin' : watershed.file_name,
                            'ecmwf_watershed' : ecmwf_watershed_name,
                            'ecmwf_subbasin' : ecmwf_subbasin_name,
                            'title' : format_watershed_title(watershed.watershed_name,
                                                            watershed.subbasin_name)
                            }
                #prepare kml files
                drainage_line_kml = os.path.join(file_path, watershed.kml_drainage_line_layer)
                if os.path.exists(drainage_line_kml) and watershed.kml_drainage_line_layer:
                    drainage_line_kml = os.path.basename(drainage_line_kml)
                    kml_info['drainage_line'] = '/static/erfp_tool/kml/%s/%s' \
                                % (watershed.folder_name, 
                                   watershed.kml_drainage_line_layer)
                catchment_kml = os.path.join(file_path, watershed.kml_catchment_layer)
                if os.path.exists(catchment_kml) and watershed.kml_catchment_layer:
                    catchment_kml = os.path.basename(catchment_kml)
                    kml_info['catchment'] = '/static/erfp_tool/kml/%s/%s' \
                                            % (watershed.folder_name,
                                               watershed.kml_catchment_layer)
                gage_kml = os.path.join(file_path, watershed.kml_gage_layer)
                if os.path.exists(gage_kml) and watershed.kml_gage_layer:
                    catchment_kml = os.path.basename(gage_kml)
                    kml_info['gage'] = '/static/erfp_tool/kml/%s/%s' \
                                            % (watershed.folder_name,
                                               watershed.kml_gage_layer)
        
                layers_info.append(kml_info)
            #if geoserver
            else: # (get geoserver info)
                geoserver_info = {'watershed': watershed.folder_name, 
                                  'subbasin': watershed.file_name,
                                  'ecmwf_watershed' : ecmwf_watershed_name,
                                  'ecmwf_subbasin' : ecmwf_subbasin_name,
                                  'geoserver_url': "%s/wms" % watershed.geoserver.url,
                                  'title' : format_watershed_title(watershed.watershed_name,
                                                                watershed.subbasin_name)
                                  }
                                  
                engine = GeoServerSpatialDatasetEngine(endpoint="%s/rest" % watershed.geoserver.url, 
                                                       username=watershed.geoserver.username,
                                                       password=watershed.geoserver.password)
                #LOAD DRAINAGE LINE
                try:
                    #load drainage line layer if exists
                    drainage_line_info = engine.get_resource(resource_id=watershed.geoserver_drainage_line_layer.strip())
                    if drainage_line_info['success']:
                        #check layers attributes to see if valid
                        layer_attributes = drainage_line_info['result']['attributes']
                        missing_attributes = []
                        contained_attributes = []
                        #check required attributes
                        #necessary_attributes = ['COMID','watershed', 'subbasin', 'wwatershed','wsubbasin']
                        
                        def find_add_attribute_ci(attribute, layer_attributes, contained_attributes):
                            """
                            Case insensitive attribute search and add
                            """
                            for layer_attribute in layer_attributes:    
                                if layer_attribute.lower() == attribute.lower():
                                    contained_attributes.append(layer_attribute)
                                    return True
                            return False
                                
                        #check COMID/HydroID attribute
                        if not find_add_attribute_ci('COMID', layer_attributes, contained_attributes):
                            missing_attributes.append('COMID')
                            if not find_add_attribute_ci('HydroID', layer_attributes, contained_attributes):
                                missing_attributes.append('HydroID')
                        
                        #check ECMWF watershed/subbasin attributes
                        if not find_add_attribute_ci('watershed', layer_attributes, contained_attributes) \
                        or not find_add_attribute_ci('subbasin', layer_attributes, contained_attributes):
                            missing_attributes.append('watershed')
                            missing_attributes.append('subbasin')
                            
                        #check WRF-Hydro watershed/subbasin attributes
                        if not find_add_attribute_ci('wwatershed', layer_attributes, contained_attributes) \
                        or not find_add_attribute_ci('wsubbasin', layer_attributes, contained_attributes):
                            missing_attributes.append('wwatershed')
                            missing_attributes.append('wsubbasin')
                            
                        #check optional attributes
                        optional_attributes = ['usgs_id', 'nws_id', 'hydroserve']
                        for optional_attribute in optional_attributes:
                            find_add_attribute_ci(optional_attribute, layer_attributes, contained_attributes)
                            
                        latlon_bbox = drainage_line_info['result']['latlon_bbox'][:4]
                        geoserver_info['drainage_line'] = {'name': watershed.geoserver_drainage_line_layer,
                                                           'geojsonp': drainage_line_info['result']['wfs']['geojsonp'],
                                                           'latlon_bbox': [latlon_bbox[0],latlon_bbox[2],latlon_bbox[1],latlon_bbox[3]],
                                                           'projection': drainage_line_info['result']['projection'],
                                                           'contained_attributes': contained_attributes,
                                                           'missing_attributes': missing_attributes,
                                                           }
                        #check if needed attribute is there to perfrom query based rendering of layer
                        if 'Natur_Flow' not in layer_attributes:
                            geoserver_info['drainage_line']['geoserver_method'] = "simple"
                        else:
                            geoserver_info['drainage_line']['geoserver_method'] = "natur_flow_query"
                    else:
                        geoserver_info['drainage_line'] = {'error': drainage_line_info['error']}
                        
                except Exception:
                    geoserver_info['drainage_line'] = {'error': "Invalid layer or GeoServer error. Recommended projection for layers is GCS_WGS_1984."}
                    pass
                
                if watershed.geoserver_catchment_layer:
                    #LOAD CATCHMENT
                    try:
                        #load catchment layer if exists
                        catchment_info = engine.get_resource(resource_id=watershed.geoserver_catchment_layer.strip())
                        if catchment_info['success']: 
                            latlon_bbox = catchment_info['result']['latlon_bbox'][:4]
                            geoserver_info['catchment'] = {'name': watershed.geoserver_catchment_layer,
                                                           'latlon_bbox': [latlon_bbox[0],latlon_bbox[2],latlon_bbox[1],latlon_bbox[3]],
                                                           'projection': catchment_info['result']['projection'],
                                                      }
                        else:
                            geoserver_info['catchment'] = {'error': catchment_info['error']}
                                                      
                    except Exception:
                        geoserver_info['catchment'] = {'error': "Invalid layer or GeoServer error. Recommended projection for layers is GCS_WGS_1984."}
                        pass

                if watershed.geoserver_gage_layer:
                    #LOAD GAGE
                    try:
                        #load gage layer if exists
                        gage_info = engine.get_resource(resource_id=watershed.geoserver_gage_layer.strip())
                        if gage_info['success']: 
                            latlon_bbox = gage_info['result']['latlon_bbox'][:4]
                            geoserver_info['gage'] = {'name': watershed.geoserver_gage_layer,
                                                      'latlon_bbox': [latlon_bbox[0],latlon_bbox[2],latlon_bbox[1],latlon_bbox[3]],
                                                      'projection': gage_info['result']['projection'],
                                                     }
                        else:
                            geoserver_info['gage'] = {'error': gage_info['error']}
                            
                    except Exception:
                        geoserver_info['gage'] = {'error': "Invalid layer or GeoServer error. Recommended projection for layers is GCS_WGS_1984." }
                        pass

                if watershed.geoserver_ahps_station_layer:
                    #LOAD AHPS STATION
                    try:
                        #load gage layer if exists
                        ahps_station_info = engine.get_resource(resource_id=watershed.geoserver_ahps_station_layer.strip())
                        if ahps_station_info['success']: 
                            latlon_bbox = ahps_station_info['result']['latlon_bbox'][:4]
                            geoserver_info['ahps_station'] = {'name': watershed.geoserver_ahps_station_layer,
                                                              'geojsonp': ahps_station_info['result']['wfs']['geojsonp'],
                                                              'latlon_bbox': [latlon_bbox[0],latlon_bbox[2],latlon_bbox[1],latlon_bbox[3]],
                                                              'projection': ahps_station_info['result']['projection'],
                                                             }
                        else:
                            geoserver_info['ahps_station'] = {'error': ahps_station_info['error']}
                            
                    except Exception:
                        geoserver_info['ahps_station'] = {'error': "Invalid layer or GeoServer error. Recommended projection for layers is GCS_WGS_1984."}
                        pass
                
                
                if geoserver_info:                
                    layers_info.append(geoserver_info)

            group_id += 1
            
        watershed_list = []
        for watershed in watersheds:
            watershed_list.append(("%s (%s)" % (watershed.watershed_name, watershed.subbasin_name),
                                   "%s:%s" % (watershed.folder_name, watershed.file_name)))
        watershed_select = {
                            'display_text': 'Select Watershed',
                            'name': 'watershed_select',
                            'options': watershed_list,
                            'placeholder': 'Select Watershed',
                           }          

        units_toggle_switch = { 
                                'display_text': 'Units',
                                'name': 'units-toggle',
                                'on_label': 'Metric',
                                'off_label': 'English',
                                'initial': True,
                              }

        ecmwf_toggle_switch = {
                                'display_text' : "ECMWF",
                                'name': 'ecmwf-toggle',
                                'on_style': 'success',
                                'initial': True,
                              }

        wrf_toggle_switch = {
                                'display_text' : "WRF-Hydro",
                                'name': 'wrf-toggle',
                                'on_style': 'warning',
                                'initial': True,
                              }

        #Query DB for settings
        main_settings  = session.query(MainSettings).order_by(MainSettings.id).first()
        base_layer = main_settings.base_layer
        session.close()
     
        base_layer_info = {
                            'name': base_layer.name,
                            'api_key':base_layer.api_key,
                          }
    
        context = {
                    'layers_info_json' : json.dumps(layers_info),
                    'layers_info': layers_info,
                    'base_layer_info' : json.dumps(base_layer_info),
                    'watershed_select' : watershed_select,
                    'units_toggle_switch' : units_toggle_switch,
                    'ecmwf_toggle_switch' : ecmwf_toggle_switch,
                    'wrf_toggle_switch' : wrf_toggle_switch,
                  }
    
        return render(request, 'erfp_tool/map.html', context)
    #send them home
    return redirect('/apps/erfp-tool/')


@user_passes_test(user_permission_test)
def settings(request):
    """
    Controller for the app settings page.
    """
    
    session = SettingsSessionMaker()
    # Query DB for base layers
    base_layers = session.query(BaseLayer).all()
    base_layer_list = []
    base_layer_api_keys = {}
    for base_layer in base_layers:
        base_layer_list.append((base_layer.name, base_layer.id))
        base_layer_api_keys[base_layer.id] = base_layer.api_key

    #Query DB for settings
    main_settings  = session.query(MainSettings).order_by(MainSettings.id).first()

    base_layer_select_input = {
                'display_text': 'Select a Base Layer',
                'name': 'base-layer-select',
                'multiple': False,
                'options': base_layer_list,
                'initial': main_settings.base_layer.name,
                }

    base_layer_api_key_input = {
                'display_text': 'Base Layer API Key',
                'name': 'api-key-input',
                'placeholder': 'e.g.: a1b2c3-d4e5d6-f7g8h9',
                'icon_append':'glyphicon glyphicon-lock',
                'initial': main_settings.base_layer.api_key
              }
              
    ecmwf_rapid_directory_input = {
                'display_text': 'Server Folder Location of ECMWF-RAPID files',
                'name': 'ecmwf-rapid-location-input',
                'placeholder': 'e.g.: /home/username/work/rapid/ecmwf_output',
                'icon_append':'glyphicon glyphicon-folder-open',
                'initial': main_settings.ecmwf_rapid_prediction_directory,
              }

    era_interim_rapid_directory_input = {
                'display_text': 'Server Folder Location of ERA Interim RAPID files',
                'name': 'era-interim-rapid-location-input',
                'placeholder': 'e.g.: /home/username/work/rapid/era_interim',
                'icon_append':'glyphicon glyphicon-folder-open',
                'initial': main_settings.era_interim_rapid_directory,
              }
              
    wrf_hydro_rapid_directory_input = {
                'display_text': 'Server Folder Location of WRF-Hydro RAPID files',
                'name': 'wrf-hydro-rapid-location-input',
                'placeholder': 'e.g.: /home/username/work/rapid/wrf_output',
                'icon_append':'glyphicon glyphicon-folder-open',
                'initial': main_settings.wrf_hydro_rapid_prediction_directory,
              }
              
    submit_button = {'buttons': [
                                 {'display_text': 'Submit',
                                  'name': 'submit-changes-settings',
                                  'attributes': 'id=submit-changes-settings',
                                  'type': 'submit'
                                  }
                                ],
                 }
              
    context = {
                'base_layer_select_input': base_layer_select_input,
                'base_layer_api_key_input': base_layer_api_key_input,
                'ecmwf_rapid_input': ecmwf_rapid_directory_input,
                'era_interim_rapid_input': era_interim_rapid_directory_input,
                'wrf_hydro_rapid_input':wrf_hydro_rapid_directory_input,
                'submit_button': submit_button,
                'base_layer_api_keys': json.dumps(base_layer_api_keys),
                'app_instance_id': main_settings.app_instance_id,
              }
    session.close()
    
    return render(request, 'erfp_tool/settings.html', context)


@user_passes_test(user_permission_test)
def add_watershed(request):
    """
    Controller for the app add_watershed page.
    """
    #initialize session
    session = SettingsSessionMaker()

    watershed_name_input = {
                'display_text': 'Watershed Display Name',
                'name': 'watershed-name-input',
                'placeholder': 'e.g.: Magdalena',
                'icon_append':'glyphicon glyphicon-home',
              }
              
    subbasin_name_input = {
                'display_text': 'Subbasin Display Name',
                'name': 'subbasin-name-input',
                'placeholder': 'e.g.: El Banco',
                'icon_append':'glyphicon glyphicon-tree-deciduous',
              }
              
    # Query DB for data stores
    data_stores = session.query(DataStore).all()
    data_store_list = []
    for data_store in data_stores:
        data_store_list.append(("%s (%s)" % (data_store.name, data_store.api_endpoint),
                                 data_store.id))

    data_store_select = {
                'display_text': 'Select a Data Store',
                'name': 'data-store-select',
                'options': data_store_list,
                'placeholder': 'Select a Data Store',
                }          
              
    ecmwf_data_store_watershed_name_input = {
                'display_text': 'ECMWF Watershed Data Store Name',
                'name': 'ecmwf-data-store-watershed-name-input',
                'placeholder': 'e.g.: magdalena',
                'icon_append':'glyphicon glyphicon-home',
              }
              
    ecmwf_data_store_subbasin_name_input = {
                'display_text': 'ECMWF Subbasin Data Store Name',
                'name': 'ecmwf-data-store-subbasin-name-input',
                'placeholder': 'e.g.: el_banco',
                'icon_append':'glyphicon glyphicon-tree-deciduous',
              }

    wrf_hydro_data_store_watershed_name_input = {
                'display_text': 'WRF-Hydro Watershed Data Store Name',
                'name': 'wrf-hydro-data-store-watershed-name-input',
                'placeholder': 'e.g.: nfie_wrfhydro_conus',
                'icon_append':'glyphicon glyphicon-home',
              }
              
    wrf_hydro_data_store_subbasin_name_input = {
                'display_text': 'WRF-Hydro Subbasin Data Store Name',
                'name': 'wrf-hydro-data-store-subbasin-name-input',
                'placeholder': 'e.g.: nfie_wrfhydro_conus',
                'icon_append':'glyphicon glyphicon-tree-deciduous',
              }

    # Query DB for geoservers
    geoservers = session.query(Geoserver).all()
    geoserver_list = []
    for geoserver in geoservers:
        geoserver_list.append(( "%s (%s)" % (geoserver.name, geoserver.url), 
                               geoserver.id))
    session.close()

    geoserver_select= {
                'display_text': 'Select a Geoserver',
                'name': 'geoserver-select',
                'options': geoserver_list,
                'placeholder': 'Select a Geoserver',
              }
                
    geoserver_drainage_line_input = {
                'display_text': 'Geoserver Drainage Line Layer',
                'name': 'geoserver-drainage-line-input',
                'placeholder': 'e.g.: erfp:streams',
                'icon_append':'glyphicon glyphicon-link',
              }
              
    geoserver_catchment_input = {
                'display_text': 'Geoserver Catchment Layer',
                'name': 'geoserver-catchment-input',
                'placeholder': 'e.g.: erfp:catchment',
                'icon_append':'glyphicon glyphicon-link',
              }
              
    geoserver_gage_input = {
                'display_text': 'Geoserver Gage Layer',
                'name': 'geoserver-gage-input',
                'placeholder': 'e.g.: erfp:gage',
                'icon_append':'glyphicon glyphicon-link',
              }

    geoserver_ahps_station_input = {
                'display_text': 'Geoserver AHPS Station Layer',
                'name': 'geoserver-ahps-station-input',
                'placeholder': 'e.g.: erfp:ahps-station',
                'icon_append':'glyphicon glyphicon-link',
              }
              
    shp_upload_toggle_switch = {'display_text': 'Upload Shapefile?',
                'name': 'shp-upload-toggle',
                'on_label': 'Yes',
                'off_label': 'No',
                'on_style': 'success',
                'off_style': 'danger',
                'initial': True,
              }

    add_button = {'buttons': [
                                 {'display_text': 'Add Watershed',
                                  'icon': 'glyphicon glyphicon-plus',
                                  'style': 'success',
                                  'name': 'submit-add-watershed',
                                  'attributes': 'id=submit-add-watershed',
                                  'type': 'submit'
                                  }
                             ],
                 }

    context = {
                'watershed_name_input': watershed_name_input,
                'subbasin_name_input': subbasin_name_input,
                'data_store_select': data_store_select,
                'ecmwf_data_store_watershed_name_input': ecmwf_data_store_watershed_name_input,
                'ecmwf_data_store_subbasin_name_input': ecmwf_data_store_subbasin_name_input,
                'wrf_hydro_data_store_watershed_name_input': wrf_hydro_data_store_watershed_name_input,
                'wrf_hydro_data_store_subbasin_name_input': wrf_hydro_data_store_subbasin_name_input,
                'geoserver_select': geoserver_select,
                'geoserver_drainage_line_input': geoserver_drainage_line_input,
                'geoserver_catchment_input': geoserver_catchment_input,
                'geoserver_gage_input': geoserver_gage_input,
                'geoserver_ahps_station_input': geoserver_ahps_station_input,
                'shp_upload_toggle_switch': shp_upload_toggle_switch,
                'add_button': add_button,
              }

    return render(request, 'erfp_tool/add_watershed.html', context)


@user_passes_test(user_permission_test)
def manage_watersheds(request):        
    """
    Controller for the app manage_watersheds page.
    """
    #initialize session
    session = SettingsSessionMaker()
    num_watersheds = session.query(Watershed).count()
    session.close()
    edit_modal = {'name': 'edit_watershed_modal',
               'title': 'Edit Watershed',
               'message': 'Loading ...',
               'dismiss_button': 'Nevermind',
               'affirmative_button': 'Save Changes',
               'width': 500}
    context = {
        'initial_page': 0,
        'num_watersheds': num_watersheds,
        'edit_modal' : edit_modal
    }

    return render(request, 'erfp_tool/manage_watersheds.html', context)

@user_passes_test(user_permission_test)
def manage_watersheds_table(request):
    """
    Controller for the app manage_watersheds page.
    """
    #initialize session
    session = SettingsSessionMaker()

    # Query DB for watersheds
    RESULTS_PER_PAGE = 5
    page = int(request.GET.get('page'))

    watersheds = session.query(Watershed) \
                        .order_by(Watershed.watershed_name,
                                  Watershed.subbasin_name) \
                        .all()[(page * RESULTS_PER_PAGE):((page + 1)*RESULTS_PER_PAGE)]

    session.close()

    shp_upload_toggle_switch = {
                'name': 'shp-upload-toggle',
                'on_label': 'Yes',
                'off_label': 'No',
                'on_style': 'success',
                'off_style': 'danger',
                'initial': False,
                }
    prev_button = {'buttons': [
                {'display_text' : 'Previous',
                 'name' : 'prev_button',
                 'type' : 'submit',
                 'attributes': 'class=nav_button'}],
                }

    next_button = {'buttons':[
                {'display_text' : 'Next',
                 'name' : 'next_button',
                 'type' : 'submit',
                 'attributes': 'class=nav_button'}],
                }

    context = {
                'watersheds': watersheds,
                'shp_upload_toggle_switch': shp_upload_toggle_switch,
                'prev_button': prev_button,
                'next_button': next_button,
              }

    return render(request, 'erfp_tool/manage_watersheds_table.html', context)

@user_passes_test(user_permission_test)
def edit_watershed(request):
    """
    Controller for the app manage_watersheds page.
    """
    if request.method == 'GET':
        get_info = request.GET
        #get/check information from AJAX request
        watershed_id = get_info.get('watershed_id')

        #initialize session
        session = SettingsSessionMaker()
        #get desired watershed
        #try:
        watershed  = session.query(Watershed).get(watershed_id)
        """
        except ObjectDeletedError:
            session.close()
            return JsonResponse({ 'error': "The watershed to update does not exist." })
        """
        watershed_name_input = {
                'display_text': 'Watershed Name',
                'name': 'watershed-name-input',
                'placeholder': 'e.g.: magdalena',
                'icon_append':'glyphicon glyphicon-home',
                'initial' : watershed.watershed_name,
              }

        subbasin_name_input = {
                    'display_text': 'Subbasin Name',
                    'name': 'subbasin-name-input',
                    'placeholder': 'e.g.: el_banco',
                    'icon_append':'glyphicon glyphicon-tree-deciduous',
                    'initial' : watershed.subbasin_name,
                  }

        # Query DB for data stores
        data_stores = session.query(DataStore).all()
        data_store_list = []
        for data_store in data_stores:
            data_store_list.append(("%s (%s)" % (data_store.name, data_store.api_endpoint),
                                     data_store.id))

        data_store_select = {
                    'display_text': 'Select a Data Store',
                    'name': 'data-store-select',
                    'options': data_store_list,
                    'placeholder': 'Select a Data Store',
                    'initial' : ["%s (%s)" % (watershed.data_store.name, watershed.data_store.api_endpoint)]
                    }

        ecmwf_data_store_watershed_name_input = {
                    'display_text': 'ECMWF Watershed Data Store Name',
                    'name': 'ecmwf-data-store-watershed-name-input',
                    'placeholder': 'e.g.: magdalena',
                    'icon_append':'glyphicon glyphicon-home',
                    'initial' : watershed.ecmwf_data_store_watershed_name,
                  }
                  
        ecmwf_data_store_subbasin_name_input = {
                    'display_text': 'ECMWF Subbasin Data Store Name',
                    'name': 'ecmwf-data-store-subbasin-name-input',
                    'placeholder': 'e.g.: el_banco',
                    'icon_append':'glyphicon glyphicon-tree-deciduous',
                    'initial' : watershed.ecmwf_data_store_subbasin_name,
                  }
    
        wrf_hydro_data_store_watershed_name_input = {
                    'display_text': 'WRF-Hydro Watershed Data Store Name',
                    'name': 'wrf-hydro-data-store-watershed-name-input',
                    'placeholder': 'e.g.: magdalena',
                    'icon_append':'glyphicon glyphicon-home',
                    'initial' : watershed.wrf_hydro_data_store_watershed_name,
                  }
                  
        wrf_hydro_data_store_subbasin_name_input = {
                    'display_text': 'WRF-Hydro Subbasin Data Store Name',
                    'name': 'wrf-hydro-data-store-subbasin-name-input',
                    'placeholder': 'e.g.: el_banco',
                    'icon_append':'glyphicon glyphicon-tree-deciduous',
                    'initial' : watershed.wrf_hydro_data_store_subbasin_name,
                  }
       # Query DB for geoservers
        geoservers = session.query(Geoserver).all()
        geoserver_list = []
        for geoserver in geoservers:
            geoserver_list.append(( "%s (%s)" % (geoserver.name, geoserver.url),
                                   geoserver.id))

        geoserver_select= {
                    'display_text': 'Select a Geoserver',
                    'name': 'geoserver-select',
                    'options': geoserver_list,
                    'placeholder': 'Select a Geoserver',
                    'initial' : ["%s (%s)" % (watershed.geoserver.name, watershed.geoserver.url)]
                    }

        geoserver_drainage_line_input = {
                    'display_text': 'Geoserver Drainage Line Layer',
                    'name': 'geoserver-drainage-line-input',
                    'placeholder': 'e.g.: erfp:streams',
                    'icon_append':'glyphicon glyphicon-link',
                    'initial' : watershed.geoserver_drainage_line_layer
                  }
        geoserver_catchment_input = {
                    'display_text': 'Geoserver Catchment Layer (Optional)',
                    'name': 'geoserver-catchment-input',
                    'placeholder': 'e.g.: erfp:catchment',
                    'icon_append':'glyphicon glyphicon-link',
                    'initial' : watershed.geoserver_catchment_layer
                  }
        geoserver_gage_input = {
                    'display_text': 'Geoserver Gage Layer (Optional)',
                    'name': 'geoserver-gage-input',
                    'placeholder': 'e.g.: erfp:gage',
                    'icon_append':'glyphicon glyphicon-link',
                    'initial' : watershed.geoserver_gage_layer
                  }
        geoserver_ahps_station_input = {
                    'display_text': 'Geoserver AHPS Station Layer (Optional)',
                    'name': 'geoserver-ahps-station-input',
                    'placeholder': 'e.g.: erfp:ahps-station',
                    'icon_append':'glyphicon glyphicon-link',
                    'initial' : watershed.geoserver_ahps_station_layer
                  }
        shp_upload_toggle_switch = {'display_text': 'Upload Shapefile?',
                    'name': 'shp-upload-toggle',
                    'on_label': 'Yes',
                    'off_label': 'No',
                    'on_style': 'success',
                    'off_style': 'danger',
                    'initial': False,
                    }

        add_button = {'buttons': [
                                     {'display_text': 'Add Watershed',
                                      'icon': 'glyphicon glyphicon-plus',
                                      'style': 'success',
                                      'name': 'submit-add-watershed',
                                      'attributes': 'id=submit-add-watershed',
                                      'type': 'submit'
                                      }
                                 ],
                     }

        context = {
                    'watershed_name_input': watershed_name_input,
                    'subbasin_name_input': subbasin_name_input,
                    'data_store_select': data_store_select,
                    'ecmwf_data_store_watershed_name_input': ecmwf_data_store_watershed_name_input,
                    'ecmwf_data_store_subbasin_name_input': ecmwf_data_store_subbasin_name_input,
                    'wrf_hydro_data_store_watershed_name_input': wrf_hydro_data_store_watershed_name_input,
                    'wrf_hydro_data_store_subbasin_name_input': wrf_hydro_data_store_subbasin_name_input,
                    'geoserver_select': geoserver_select,
                    'geoserver_drainage_line_input': geoserver_drainage_line_input,
                    'geoserver_catchment_input': geoserver_catchment_input,
                    'geoserver_gage_input': geoserver_gage_input,
                    'geoserver_ahps_station_input': geoserver_ahps_station_input,
                    'shp_upload_toggle_switch': shp_upload_toggle_switch,
                    'add_button': add_button,
                    'watershed' : watershed,
                  }
        page_html = render(request, 'erfp_tool/edit_watershed.html', context)
        session.close()

        return page_html

@user_passes_test(user_permission_test)
def add_data_store(request):        
    """
    Controller for the app add_data_store page.
    """
    #initialize session
    session = SettingsSessionMaker()

    data_store_name_input = {
                'display_text': 'Data Store Server Name',
                'name': 'data-store-name-input',
                'placeholder': 'e.g.: My CKAN Server',
                'icon_append':'glyphicon glyphicon-tag',
              }

    # Query DB for data store types
    data_store_types = session.query(DataStoreType).filter(DataStoreType.id>1).all()
    data_store_type_list = []
    for data_store_type in data_store_types:
        data_store_type_list.append((data_store_type.human_readable_name, 
                                     data_store_type.id))

    session.close()

    data_store_type_select_input = {
                'display_text': 'Data Store Type',
                'name': 'data-store-type-select',
                'options': data_store_type_list,
                'initial': data_store_type_list[0][0]
                }          

    data_store_endpoint_input = {
                'display_text': 'Data Store API Endpoint',
                'name': 'data-store-endpoint-input',
                'placeholder': 'e.g.: http://ciwweb.chpc.utah.edu/api/3/action',
                'icon_append':'glyphicon glyphicon-cloud-download',
              }

    data_store_api_key_input = {
                'display_text': 'Data Store API Key',
                'name': 'data-store-api-key-input',
                'placeholder': 'e.g.: a1b2c3-d4e5d6-f7g8h9',
                'icon_append':'glyphicon glyphicon-lock',
              }

    add_button = {'buttons': [
                                 {'display_text': 'Add Data Store',
                                  'icon': 'glyphicon glyphicon-plus',
                                  'style': 'success',
                                  'name': 'submit-add-data-store',
                                  'attributes': 'id=submit-add-data-store',
                                  'type': 'submit'
                                  }
                                ],
                 }

    context = {
                'data_store_name_input': data_store_name_input,
                'data_store_type_select_input': data_store_type_select_input,
                'data_store_endpoint_input': data_store_endpoint_input,
                'data_store_api_key_input': data_store_api_key_input,
                'add_button': add_button,
              }
    return render(request, 'erfp_tool/add_data_store.html', context)

@user_passes_test(user_permission_test)
def manage_data_stores(request):        
    """
    Controller for the app manage_data_stores page.
    """
    #initialize session
    session = SettingsSessionMaker()
    num_data_stores = session.query(DataStore).count() - 1
    session.close()
    context = {
                'initial_page': 0,
                'num_data_stores': num_data_stores,
              }
              
    return render(request, 'erfp_tool/manage_data_stores.html', context)

@user_passes_test(user_permission_test)
def manage_data_stores_table(request):
    """
    Controller for the app manage_data_stores page.
    """
    #initialize session
    session = SettingsSessionMaker()
    RESULTS_PER_PAGE = 5
    page = int(request.GET.get('page'))

    # Query DB for data store types
    data_stores = session.query(DataStore) \
                        .filter(DataStore.id>1) \
                        .order_by(DataStore.name) \
                        .all()[(page * RESULTS_PER_PAGE):((page + 1)*RESULTS_PER_PAGE)]

    prev_button = {'buttons': [
                {'display_text' : 'Previous',
                 'name' : 'prev_button',
                 'type' : 'submit',
                 'attributes': 'class=nav_button'}],
                }

    next_button = {'buttons':[
                {'display_text' : 'Next',
                 'name' : 'next_button',
                 'type' : 'submit',
                 'attributes': 'class=nav_button'}],
                }

    context = {
                'prev_button' : prev_button,
                'next_button': next_button,
                'data_stores': data_stores,
              }

    table_html = render(request, 'erfp_tool/manage_data_stores_table.html', context)
    #in order to close the session, the request needed to be rendered first
    session.close()

    return table_html

@user_passes_test(user_permission_test)
def add_geoserver(request):        
    """
    Controller for the app add_geoserver page.
    """
    geoserver_name_input = {
        'display_text': 'Geoserver Name',
        'name': 'geoserver-name-input',
        'placeholder': 'e.g.: My Geoserver',
        'icon_append':'glyphicon glyphicon-tag',
        }

    geoserver_url_input = {
        'display_text': 'Geoserver Url',
        'name': 'geoserver-url-input',
        'placeholder': 'e.g.: http://felek.cns.umass.edu:8080/geoserver',
        'icon_append':'glyphicon glyphicon-cloud-download',
        }
              
    geoserver_username_input = {
        'display_text': 'Geoserver Username',
        'name': 'geoserver-username-input',
        'placeholder': 'e.g.: admin',
        'icon_append':'glyphicon glyphicon-user',
        }
        
    add_button = {'buttons': [
                                 {'display_text': 'Add Geoserver',
                                  'icon': 'glyphicon glyphicon-plus',
                                  'style': 'success',
                                  'name': 'submit-add-geoserver',
                                  'attributes': 'id=submit-add-geoserver',
                                  'type': 'submit'
                                  }
                                ],
                 }

    context = {
                'geoserver_name_input': geoserver_name_input,
                'geoserver_url_input': geoserver_url_input,
                'geoserver_username_input': geoserver_username_input,
                'add_button': add_button,
              }
              
    return render(request, 'erfp_tool/add_geoserver.html', context)
 
@user_passes_test(user_permission_test)
def manage_geoservers(request):        
    """
    Controller for the app manage_geoservers page.
    """
    #initialize session
    session = SettingsSessionMaker()
    num_geoservers = session.query(Geoserver).count() - 1
    session.close()

    context = {
                'initial_page': 0,
                'num_geoservers': num_geoservers,
              }

    return render(request, 'erfp_tool/manage_geoservers.html', context)

@user_passes_test(user_permission_test)
def manage_geoservers_table(request):
    """
    Controller for the app manage_geoservers page.
    """
    #initialize session
    session = SettingsSessionMaker()
    RESULTS_PER_PAGE = 5
    page = int(request.GET.get('page'))

    # Query DB for data store types
    geoservers = session.query(Geoserver)\
                        .filter(Geoserver.id>1) \
                        .order_by(Geoserver.name, Geoserver.url) \
                        .all()[(page * RESULTS_PER_PAGE):((page + 1)*RESULTS_PER_PAGE)]

    prev_button = {'buttons': [
                {'display_text' : 'Previous',
                 'name' : 'prev_button',
                 'type' : 'submit',
                 'attributes': 'class=nav_button'}],
                }

    next_button = {'buttons':[
                {'display_text' : 'Next',
                 'name' : 'next_button',
                 'type' : 'submit',
                 'attributes': 'class=nav_button'}],
                }

    context = {
                'prev_button' : prev_button,
                'next_button': next_button,
                'geoservers': geoservers,
              }

    session.close()

    return render(request, 'erfp_tool/manage_geoservers_table.html', context)

@user_passes_test(user_permission_test)
def add_watershed_group(request):        
    """
    Controller for the app add_watershed_group page.
    """
    watershed_group_name_input = {
        'display_text': 'Watershed Group Name',
        'name': 'watershed-group-name-input',
        'placeholder': 'e.g.: My Watershed Group',
        'icon_append':'glyphicon glyphicon-tag',
        }
 
   #initialize session
    session = SettingsSessionMaker()
   #Query DB for settings
    watersheds  = session.query(Watershed) \
                        .order_by(Watershed.watershed_name,
                                  Watershed.subbasin_name) \
                        .all()
    watershed_list = []
    for watershed in watersheds:
        watershed_list.append(("%s (%s)" % \
                              (watershed.watershed_name, watershed.subbasin_name),
                              watershed.id))
                              
    session.close()
    
    watershed_select = {
                'display_text': 'Select Watershed(s) to Add to Group',
                'name': 'watershed_select',
                'options': watershed_list,
                'multiple': True,
                'placeholder': 'Select Watershed(s)',
                }
 
    add_button = {'buttons': [
                                 {'display_text': 'Add Watershed Group',
                                  'icon': 'glyphicon glyphicon-plus',
                                  'style': 'success',
                                  'name': 'submit-add-watershed-group',
                                  'attributes': 'id=submit-add-watershed-group',
                                  'type': 'submit'
                                  }
                                ],
                 }

    context = {
                'watershed_group_name_input': watershed_group_name_input,
                'watershed_select': watershed_select,
                'add_button': add_button,
              }
    return render(request, 'erfp_tool/add_watershed_group.html', context)
 
@user_passes_test(user_permission_test)
def manage_watershed_groups(request):        
    """
    Controller for the app manage_watershed_groups page.
    """
    #initialize session
    session = SettingsSessionMaker()
    num_watershed_groups = session.query(WatershedGroup).count()
    session.close()
    context = {
                'initial_page': 0,
                'num_watershed_groups': num_watershed_groups,
              }
    return render(request, 'erfp_tool/manage_watershed_groups.html', context)

@user_passes_test(user_permission_test)
def manage_watershed_groups_table(request):
    """
    Controller for the app manage_watershed_groups page.
    """
    #initialize session
    session = SettingsSessionMaker()
    RESULTS_PER_PAGE = 5
    page = int(request.GET.get('page'))

    # Query DB for data store types
    watershed_groups = session.query(WatershedGroup)\
                                .order_by(WatershedGroup.name) \
                                .all()[(page * RESULTS_PER_PAGE):((page + 1)*RESULTS_PER_PAGE)]

    watersheds = session.query(Watershed) \
                        .order_by(Watershed.watershed_name,
                                  Watershed.subbasin_name)\
                        .all()


    prev_button = {'buttons': [
                {'display_text' : 'Previous',
                 'name' : 'prev_button',
                 'type' : 'submit',
                 'attributes': 'class=nav_button'}],
                }

    next_button = {'buttons':[
                {'display_text' : 'Next',
                 'name' : 'next_button',
                 'type' : 'submit',
                 'attributes': 'class=nav_button'}],
                }

    context = {
                'prev_button' : prev_button,
                'next_button': next_button,
                'watershed_groups': watershed_groups,
                'watersheds' : watersheds,
              }
    table_html = render(request, 'erfp_tool/manage_watershed_groups_table.html', context)
    session.close()

    return table_html
    
@user_passes_test(user_permission_test)
def getting_started(request):
    """
    Controller for the app home page.
    """
   
    context = {
                
              }

    return render(request, 'erfp_tool/getting_started.html', context)