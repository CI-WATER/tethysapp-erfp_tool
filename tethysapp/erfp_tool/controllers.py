import json
import os

#django imports
from django.contrib.auth.decorators import user_passes_test
from django.shortcuts import redirect, render 

#tethys imports
from tethys_dataset_services.engines import GeoServerSpatialDatasetEngine

#local imports
from .model import (BaseLayer, DataStore, DataStoreType, Geoserver, MainSettings,
                    SettingsSessionMaker, Watershed, WatershedGroup)
from .functions import (format_name, format_watershed_title, 
                        user_permission_test)

def home(request):
    """
    Controller for the app home page.
    """
   
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
            #if on the local server
            if watershed.geoserver_id == 1:
                file_path = os.path.join(kml_file_location, format_name(watershed.watershed_name))
                kml_info = {'watershed':watershed.folder_name, 
                            'subbasin':watershed.file_name,
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
        
                kml_info['title'] = format_watershed_title(watershed.watershed_name,
                                                            watershed.subbasin_name)
                layers_info.append(kml_info)
            #if geoserver
            else: # (get geoserver info)
                geoserver_info = {'watershed':watershed.folder_name, 
                            'subbasin':watershed.file_name,
                            'geoserver_url': "%s/wms" % watershed.geoserver.url,
                            }
                engine = GeoServerSpatialDatasetEngine(endpoint="%s/rest" % watershed.geoserver.url, 
                                                       username=watershed.geoserver.username,
                                                       password=watershed.geoserver.password)
                #load drainage line layer if exists
                drainage_line_info = engine.get_resource(resource_id=watershed.geoserver_drainage_line_layer.strip())
                if drainage_line_info['success']:
                    #check layers attributes to see if valid
                    layer_attributes = drainage_line_info['result']['attributes']
                    optional_attributes = ['usgs_id', 'nws_id', 'hydroserver_url']
                    missing_attributes = []
                    contained_attributes = []
                    #check required attributes
                    necessary_attributes = ['watershed', 'subbasin', 'COMID']
                    for necessary_attribute in necessary_attributes:
                        found = False
                        for attribute in layer_attributes:    
                            if necessary_attribute.lower() == attribute.lower():
                                contained_attributes.append(attribute)
                                found = True
                        if not found:
                            missing_attributes.append(necessary_attribute)
                    #check optional attributes
                    for optional_attribute in optional_attributes:
                        if optional_attribute in layer_attributes:
                            contained_attributes.append(optional_attribute)
                        
                    latlon_bbox = drainage_line_info['result']['latlon_bbox'][:4]
                    geoserver_info['drainage_line'] = {'name': watershed.geoserver_drainage_line_layer,
                                                 'geojsonp': drainage_line_info['result']['wfs']['geojsonp'],
                                                 'latlon_bbox': [latlon_bbox[0],latlon_bbox[2],latlon_bbox[1],latlon_bbox[3]],
                                                 'projection': drainage_line_info['result']['projection'],
                                                 'contained_attributes': ",".join(contained_attributes),
                                                 'missing_attributes': ", ".join(missing_attributes),
                                                }
                    #check if needed attribute is there to perfrom query based rendering of layer
                    if 'Natur_Flow' not in layer_attributes:
                        geoserver_info['drainage_line']['geoserver_method'] = "simple"
                    else:
                        geoserver_info['drainage_line']['geoserver_method'] = "natur_flow_query"

                #load catchment layer if exists
                catchment_info = engine.get_resource(resource_id=watershed.geoserver_catchment_layer.strip())
                if catchment_info['success']: 
                    latlon_bbox = catchment_info['result']['latlon_bbox'][:4]
                    geoserver_info['catchment'] = {'name': watershed.geoserver_catchment_layer,
                                             'latlon_bbox': [latlon_bbox[0],latlon_bbox[2],latlon_bbox[1],latlon_bbox[3]],
                                             'projection': catchment_info['result']['projection'],
                                            }
                #load gage layer if exists
                gage_info = engine.get_resource(resource_id=watershed.geoserver_gage_layer.strip())
                if gage_info['success']: 
                    latlon_bbox = gage_info['result']['latlon_bbox'][:4]
                    geoserver_info['gage'] = {'name': watershed.geoserver_gage_layer,
                                             'latlon_bbox': [latlon_bbox[0],latlon_bbox[2],latlon_bbox[1],latlon_bbox[3]],
                                             'projection': gage_info['result']['projection'],
                                            }
                geoserver_info['title'] = format_watershed_title(watershed.watershed_name,
                                                            watershed.subbasin_name)
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

        units_toggle_switch = { 'name': 'units-toggle',
                                'on_label': 'Metric',
                                'off_label': 'English',
                                'size': 'mini',
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
                'initial': main_settings.base_layer.name
                }

    base_layer_api_key_input = {
                'display_text': 'Base Layer API Key',
                'name': 'api-key-input',
                'placeholder': 'e.g.: a1b2c3-d4e5d6-f7g8h9',
                'icon_append':'glyphicon glyphicon-lock',
                'initial': main_settings.base_layer.api_key
              }
              
    ecmwf_rapid_input = {
                'display_text': 'Server Folder Location of ECMWF-RAPID files',
                'name': 'ecmwf-rapid-location-input',
                'placeholder': 'e.g.: /home/username/work/rapid/output',
                'icon_append':'glyphicon glyphicon-folder-open',
                'initial': main_settings.local_prediction_files
              }
    morning_hour_select_input = {
                'display_text': 'Select Morning Data Download Hour',
                'name': 'morning-hour-select',
                'options': [(0,0),(1,1),(2,2),(3,3),(4,4),
                            (5,5),(6,6),(7,7),(8,8),(9,9),
                            (10,10),(11,11)],
                'initial': [main_settings.morning_hour],
                }          

    evening_hour_select_input = {
                'display_text': 'Select Evening  Data Download Hour',
                'name': 'evening-hour-select',
                'options': [(12,12),(13,13),(14,14),(15,15),(16,16),
                            (17,17),(18,18),(19,19),(20,20),(21,21),
                            (22,22),(23,23),],
                'initial': [main_settings.evening_hour],
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
                'ecmwf_rapid_input': ecmwf_rapid_input,
                'morning_hour_select_input': morning_hour_select_input,
                'evening_hour_select_input': evening_hour_select_input,
                'submit_button': submit_button,
                'base_layer_api_keys': json.dumps(base_layer_api_keys),
              }

    return render(request, 'erfp_tool/settings.html', context)


@user_passes_test(user_permission_test)
def add_watershed(request):
    """
    Controller for the app add_watershed page.
    """
    #initialize session
    session = SettingsSessionMaker()

    watershed_name_input = {
                'display_text': 'Watershed Name',
                'name': 'watershed-name-input',
                'placeholder': 'e.g.: magdalena',
                'icon_append':'glyphicon glyphicon-home',
              }
              
    subbasin_name_input = {
                'display_text': 'Subbasin Name',
                'name': 'subbasin-name-input',
                'placeholder': 'e.g.: el_banco',
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
                'geoserver_select': geoserver_select,
                'geoserver_drainage_line_input': geoserver_drainage_line_input,
                'geoserver_catchment_input': geoserver_catchment_input,
                'geoserver_gage_input': geoserver_gage_input,
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

    # Query DB for watersheds
    watersheds = session.query(Watershed) \
                        .order_by(Watershed.watershed_name,
                                  Watershed.subbasin_name) \
                        .all()

    # Query DB for data stores
    data_stores = session.query(DataStore).all()
              
    # Query DB for geoservers
    geoservers = session.query(Geoserver).all()

    shp_upload_toggle_switch = {
                'name': 'shp-upload-toggle',
                'on_label': 'Yes',
                'off_label': 'No',
                'on_style': 'success',
                'off_style': 'danger',
                'initial': False,
                }

    context = {
                'watersheds': watersheds,
                'data_stores': data_stores,
                'geoservers': geoservers,
                'shp_upload_toggle_switch': shp_upload_toggle_switch,
              }
    return render(request, 'erfp_tool/manage_watersheds.html', context)

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

    # Query DB for data store types
    data_stores = session.query(DataStore) \
                        .filter(DataStore.id>1) \
                        .order_by(DataStore.name) \
                        .all()

    context = {
                'data_stores': data_stores,
              }
              
    return render(request, 'erfp_tool/manage_data_stores.html', context)
    
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

    # Query DB for data store types
    geoservers = session.query(Geoserver)\
                        .filter(Geoserver.id>1) \
                        .order_by(Geoserver.name, Geoserver.url) \
                        .all()

    context = {
                'geoservers': geoservers,
              }
    return render(request, 'erfp_tool/manage_geoservers.html', context)

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

    # Query DB for data store types
    watershed_groups = session.query(WatershedGroup)\
                                .order_by(WatershedGroup.name) \
                                .all()
    watersheds = session.query(Watershed) \
                        .order_by(Watershed.watershed_name,
                                  Watershed.subbasin_name)\
                        .all()

    context = {
                'watershed_groups': watershed_groups,
                'watersheds' : watersheds,
              }
    return render(request, 'erfp_tool/manage_watershed_groups.html', context)