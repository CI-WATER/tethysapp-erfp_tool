import json
import os

#django imports
from django.contrib.auth.decorators import user_passes_test
from django.shortcuts import render

#local imports
from .model import (BaseLayer, DataStore, DataStoreType, Geoserver, MainSettings,
                    SettingsSessionMaker, Watershed)
from .functions import (format_watershed_title, get_subbasin_list, 
                        user_permission_test)

def home(request):
    """
    Controller for the app home page.
    """
    ##find all kml files to add to page    
    kml_file_location = os.path.join(os.path.dirname(os.path.realpath(__file__)),'public','kml')
    kml_info = []
    watersheds = sorted(os.listdir(kml_file_location))
    #add kml urls to list and add their navigation items as well
    group_id = 0
    for watershed in watersheds:
        file_path = os.path.join(kml_file_location, watershed)
        subbasin_list = get_subbasin_list(file_path)
        for subbasin in subbasin_list:
            kml_urls = {'watershed':watershed, 'subbasin':subbasin}
            #prepare kml files
            drainage_line_kml = os.path.join(file_path, subbasin + '-drainage_line.kml')
            if os.path.exists(drainage_line_kml):
                drainage_line_kml = os.path.basename(drainage_line_kml)
                kml_urls['drainage_line'] = '/static/erfp_tool/kml/%s/%s' % (watershed, drainage_line_kml)
            catchment_kml = os.path.join(file_path, subbasin + '-catchment.kml')
            if os.path.exists(catchment_kml):
                catchment_kml = os.path.basename(catchment_kml)
                kml_urls['catchment'] = '/static/erfp_tool/kml/%s/%s' % (watershed, catchment_kml)

            kml_urls['title'] = format_watershed_title(watershed,subbasin)
            kml_info.append(kml_urls)
            group_id += 1
        
    #get the base layer information
    session = SettingsSessionMaker()
    #Query DB for settings
    main_settings  = session.query(MainSettings).order_by(MainSettings.id).first()
    base_layer = main_settings.base_layer
    #Bing_apiKey = "AiW41aALyX4pDfE0jQG93WywSHLih1ihycHtwbaIPmtpZEOuw1iloQuuBmwJm5UA";
 
    base_layer_info = {
                        'name': base_layer.name,
                        'api_key':base_layer.api_key,
                        }

    context = {
                'kml_info_json' : json.dumps(kml_info),
                'kml_info': kml_info,
                'base_layer_info' : json.dumps(base_layer_info),
              }

    return render(request, 'erfp_tool/home.html', context)


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
    
    
    base_layer_input = {
                'display_text': 'Select a Base Layer',
                'name': 'base-layer-input',
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
              
    submit_button = {'buttons': [
                                 {'display_text': 'Submit',
                                  'name': 'submit-changes-settings',
                                  'attributes': 'id=submit-changes-settings',
                                  'type': 'submit'
                                  }
                                ],
                 }
              
    context = {
                'base_layer_input': base_layer_input,
                'base_layer_api_key_input': base_layer_api_key_input,
                'ecmwf_rapid_input': ecmwf_rapid_input,
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
        data_store_list.append((data_store.name + " (" + data_store.api_endpoint + ")", data_store.id))

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
        geoserver_list.append(( "%s (%s)" % (geoserver.name, geoserver.url), geoserver.id))

    geoserver_select= {
                'display_text': 'Select a Geoserver',
                'name': 'geoserver-select',
                'options': geoserver_list,
                'placeholder': 'Select a Geoserver',
                }
                
    geoserver_drainage_line_input = {
                'display_text': 'Geoserver Drainage Line KML Layer',
                'name': 'geoserver-drainage-line-input',
                'placeholder': 'e.g.: Streams:Developed',
                'icon_append':'glyphicon glyphicon-link',
                'attributes':'class=hidden',
              }
    geoserver_catchment_input = {
                'display_text': 'Geoserver Catchment KML Layer',
                'name': 'geoserver-catchment-input',
                'placeholder': 'e.g.: Streams:Developed',
                'icon_append':'glyphicon glyphicon-link',
                'attributes':'class=hidden',
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
                'add_button': add_button,
              }

    return render(request, 'erfp_tool/add_watershed.html', context)


@user_passes_test(user_permission_test)
def manage_watersheds(request):        
    """
    Controller for the app manage_watersheds page.
    """
    print request.user.is_staff
    #initialize session
    session = SettingsSessionMaker()

    # Query DB for watersheds
    watersheds = session.query(Watershed).all()

    # Query DB for data stores
    data_stores = session.query(DataStore).all()
              
    # Query DB for geoservers
    geoservers = session.query(Geoserver).all()

    context = {
                'watersheds': watersheds,
                'data_stores': data_stores,
                'geoservers': geoservers,
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
    data_store_types = session.query(DataStoreType).all()
    data_store_type_list = []
    for data_store_type in data_store_types:
        data_store_type_list.append((data_store_type.human_readable_name, data_store_type.id))

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
    data_stores = session.query(DataStore).filter(DataStore.id>1).all()

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
        'placeholder': 'e.g.: http://felek.cns.umass.edu:8080/geoserver/wms',
        'icon_append':'glyphicon glyphicon-cloud-download',
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
    geoservers = session.query(Geoserver).filter(Geoserver.id>1).all()

    context = {
                'geoservers': geoservers,
              }
    return render(request, 'erfp_tool/manage_geoservers.html', context)