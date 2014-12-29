import datetime
from django.http import JsonResponse
from django.shortcuts import render
from glob import glob
import json
import netCDF4 as NET
import numpy as np
import os

def create_navigation_string(layer_name, layer_id):
    return ('                    <li class="dropdown">'
           '                      <a href="" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false">%s<span class="caret"></span></a>' % layer_name + \
           '                      <ul id="%s" class="dropdown-menu" role="menu">' % layer_id + \
           '                        <li><a class="zoom-to-layer" href="#">Zoom To Layer</a></li>'
           '                        <li class="divider"></li>'
           '                        <li><p style="margin-left:20px;"><input class="visible" type="checkbox"> Visibility </p></li>'
           '                        <li><label style="margin-left:15px;">Opacity</label>'
           '                            <input style="margin-left:15px; width:80%;" class="opacity" type="range" min="0" max="1" step="0.01">'
           '                        </li>'
           '                      </ul>'
           '                    </li>')

    

def home(request):
    """
    Controller for the app home page.
    """
    ##find all kml files to add to page    
    kml_file_location = os.path.join(os.path.dirname(os.path.realpath(__file__)),'public','kml')
    kml_urls = {}
    watersheds = sorted(os.listdir(kml_file_location))
    #add kml urls to list and add their navigation items as well
    group_id = 0
    navigation_string = ""
    for watershed in watersheds:
        navigation_string += ('            <li><div id="%s-control">' % watershed + \
        '                <div class="collapse-control">'
        '                    <a class="closeall" data-toggle="collapse" data-target="#%s-layers">' % watershed + \
        '%s</a>' % watershed.title().replace("_"," ") + \
        '                </div>'
        '                <div id="%s-layers" class="collapse in">' % watershed + \
        '                    <ul>')

        file_path = os.path.join(kml_file_location, watershed)
        kml_urls[watershed] = {}
        for kml_file in glob(os.path.join(file_path, '*drainage_line.kml')):
            kml_urls[watershed]['drainage_line'] = '/static/erfp_tool/kml/%s/%s' % (watershed, os.path.basename(kml_file))
            navigation_string += create_navigation_string("Drainage Line", "layer" + str(group_id)+str(0))
        for kml_file in glob(os.path.join(file_path, '*catchment.kml')):
            kml_urls[watershed]['catchment'] = '/static/erfp_tool/kml/%s/%s' % (watershed, os.path.basename(kml_file))
            navigation_string += create_navigation_string("Catchment", "layer" + str(group_id)+str(1))
        navigation_string += ('                    </ul>'
        '                </div> <!-- div: %s-layers -->' % watershed + \
        '            </div></li>  <!-- div: %s-control -->' % watershed) 
        group_id += 1
            
    context = {
                'kml_urls' : json.dumps(kml_urls),
                'map_navigation' : navigation_string
              }

    return render(request, 'erfp_tool/home.html', context)

def settings(request):
    """
    Controller for the app settings page.
    """
    base_layer_input = {
                'display_text': 'Select a Base Layer',
                'name': 'base_layer-input',
                'multiple': False,
                'options': [('BingMaps', '1'), ('GoogleMaps', '2'), ('WMS', '3')],
                'initial': 'BingMaps'
                }
    base_layer_api_key_input = {
                'display_text': 'Base Layer API Key',
                'name': 'api-key-input',
                'placeholder': 'e.g.: a1b2c3-d4e5d6-f7g8h9'
              }
    ecmwf_rapid_input = {
                'display_text': 'Local Location of ECMWF-RAPID files',
                'name': 'ecmwf-rapid-location-input',
                'placeholder': 'e.g.: /home/username/work/rapid/output',
                'icon_append':'glyphicon glyphicon-folder-open'
              }
    submit_button = {'buttons': [
                                 {'display_text': 'Submit',
                                  'name': 'submit-changes-settings',
                                  'attributes': 'onclick=alert(this.name);',
                                  'type': 'submit'
                                  }
                                ],
                 }
              
    context = {
                'base_layer_input': base_layer_input,
                'base_layer_api_key_input': base_layer_api_key_input,
                'ecmwf_rapid_input': ecmwf_rapid_input,
                'submit_button': submit_button,
              }

    return render(request, 'erfp_tool/settings.html', context)

def add_watershed(request):
    """
    Controller for the app add_watershed page.
    """

    watershed_name_input = {
                'display_text': 'Watershed Name (this is the name in the data store server or folder name on local instance)',
                'name': 'watershed-name-input',
                'placeholder': 'e.g.: magdalena'
              }
    subbasin_name_input = {
                'display_text': 'Subbasin Name (this is the name in the data store server or folder name on local instance)',
                'name': 'subbasin-name-input',
                'placeholder': 'e.g.: el_banco'
              }
              
    data_store_select_input = {
                'display_text': 'Select a Data Store',
                'name': 'select-data-store',
                'options': [('CKAN', '1'), ('BYU World Water', '2'), ('Test', '3')],
                'initial': ['CKAN']
                }          
              
    geoserver_select_input = {
                'display_text': 'Select a Geoserver',
                'name': 'select-geoserver',
                'options': [('geoserver1', '1'), ('geoserver2', '2'), ('geoserver3', '3')],
                'initial': ['geoserver1']
                }
                
    geoserver_layers_input = {
                'display_text': 'Geoserver KML Layer',
                'name': 'geoserver-layers-input',
                'placeholder': 'e.g.: Streams:Developed'
              }
              

    add_button = {'buttons': [
                                 {'display_text': 'Add Watershed',
                                  'icon': 'glyphicon glyphicon-plus',
                                  'style': 'success',
                                  'name': 'submit-add-watershed',
                                  'attributes': 'onclick=alert(this.name);',
                                  'type': 'submit'
                                  }
                                ],
                 }

    context = {
                'watershed_name_input': watershed_name_input,
                'subbasin_name_input': subbasin_name_input,
                'geoserver_select_input': geoserver_select_input,
                'geoserver_layers_input': geoserver_layers_input,
                'data_store_select_input': data_store_select_input,
                'add_button': add_button,
              }

    return render(request, 'erfp_tool/add_watershed.html', context)
    
def add_data_store(request):        
    data_store_name_input = {
                'display_text': 'Data Store Server Name',
                'name': 'ckan-name-input',
                'placeholder': 'e.g.: My CKAN Server'
              }
    data_store_type_select_input = {
                'display_text': 'Data Store Type',
                'name': 'select-data-store',
                'options': [('CKAN', 'ckan'), ('HydroShare', 'hydroshare')],
                'initial': ['CKAN']
                }          

    data_store_endpoint_input = {
                'display_text': 'Data Store API Endpoint',
                'name': 'data-store-endpoint-input',
                'placeholder': 'e.g.: http://ciwweb.chpc.utah.edu/api/3/action'
              }

    data_store_api_key_input = {
                'display_text': 'Data Store API Key',
                'name': 'data-store-api-key-input',
                'placeholder': 'e.g.: a1b2c3-d4e5d6-f7g8h9'
              }

    add_button = {'buttons': [
                                 {'display_text': 'Add Data Store',
                                  'icon': 'glyphicon glyphicon-plus',
                                  'style': 'success',
                                  'name': 'submit-add-data-store',
                                  'attributes': 'onclick=alert(this.name);',
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

def add_geoserver(request):        
    geoserver_location_input = {
                'display_text': 'Geoserver Location',
                'name': 'geoserver-location-input',
                'placeholder': 'e.g.: http://felek.cns.umass.edu:8080/geoserver/wms'
              }

    add_button = {'buttons': [
                                 {'display_text': 'Add Geoserver',
                                  'icon': 'glyphicon glyphicon-plus',
                                  'style': 'success',
                                  'name': 'submit-add-geoserver',
                                  'attributes': 'onclick=alert(this.name);',
                                  'type': 'submit'
                                  }
                                ],
                 }

    context = {
                'geoserver_location_input': geoserver_location_input,
                'add_button': add_button,
              }

    return render(request, 'erfp_tool/add_geoserver.html', context)
    
def find_most_current_files(path_to_watershed_files, basin_name):
    """""
    Finds the current output from downscaled ECMWF forecasts
    """""
    directories = sorted(os.listdir(path_to_watershed_files), reverse=True)
    for directory in directories:    
        date = datetime.datetime.strptime(directory.split(".")[0],"%Y%m%d")
        time = directory.split(".")[-1]
        path_to_files = os.path.join(path_to_watershed_files, directory)
        if os.path.exists(path_to_files):
            basin_files = glob(os.path.join(path_to_files,
                                            "*"+basin_name+"*.nc"))
            if len(basin_files) >0:
                hour = int(time)/100
                return basin_files, date + datetime.timedelta(0,int(hour)*60*60)
    #there are no files found
    return None, None

def get_reach_index(reach_id, basin_files):
    """
    Gets the index of the reach from the COMID 
    """
    data_nc = NET.Dataset(basin_files[0])
    com_ids = data_nc.variables['COMID'][:]
    try:
        reach_index = np.where(com_ids==int(reach_id))[0][0]
    except Exception as ex:
        print ex
        reach_index = None
        pass
    return reach_index
    
def format_name(string):
    return string.strip().replace(" ", "_").lower()

def get_hydrograph(request):
    """""
    Plots all 52 ensembles with min, max, avg
    """""
    path_to_rapid_output = '/home/alan/work/rapid/output'

    #get/check information from AJAX request
    post_info = request.GET
    watershed_name = format_name(post_info['watershed_name']) if 'watershed_name' in post_info else None
    subbasin_name = format_name(post_info['subbasin_name']) if 'subbasin_name' in post_info else None
    reach_id = post_info['reach_id'] if 'reach_id' in post_info else None
    if not reach_id or not watershed_name or not subbasin_name:
        return JsonResponse({'error' : 'AJAX request input faulty'})

    #find/check current output datasets    
    path_to_output_files = os.path.join(path_to_rapid_output, watershed_name)
    basin_files, start_date = find_most_current_files(path_to_output_files,subbasin_name)
    if not basin_files or not start_date:
        return JsonResponse({'error' : 'Recent forecast not found'})

    #get/check the index of the reach
    reach_index = get_reach_index(reach_id, basin_files)
    if not reach_index:
        return JsonResponse({'error' : 'Reach with id: ' + str(reach_id) + ' not found'})    

    #get information from datasets
    all_data_first_half = []
    all_data_second_half = []
    time = []
    for in_nc in basin_files:
        index = int(os.path.basename(in_nc)[:-3].split("_")[-1])
        data_nc = NET.Dataset(in_nc)
        qout = data_nc.variables['Qout']
        dataValues = qout[:,reach_index]
        
        if (len(dataValues)>len(time)):
            time = []
            for i in range(0,len(dataValues)):
                next_time = int((start_date+datetime.timedelta(0,i*6*60*60)).strftime('%s'))*1000
                time.append(next_time)
        all_data_first_half.append(dataValues[:40].clip(min=0))
        if(index < 52):
            all_data_second_half.append(dataValues[40:].clip(min=0))
        data_nc.close()

    #perform analysis on datasets
    all_data_first = np.array(all_data_first_half)
    all_data_second = np.array(all_data_second_half)
    #get mean
    mean_data_first = np.mean(all_data_first, axis=0)
    mean_data_second = np.mean(all_data_second, axis=0)
    mean_series = np.concatenate([mean_data_first,mean_data_second])
    #get std dev
    std_dev_first = np.std(all_data_first, axis=0)
    std_dev_second = np.std(all_data_second, axis=0)
    std_dev = np.concatenate([std_dev_first,std_dev_second])
    #get max
    max_data_first = np.amax(all_data_first, axis=0)
    max_data_second = np.amax(all_data_second, axis=0)
    max_series = np.concatenate([max_data_first,max_data_second])
    #get min
    min_data_first = np.amin(all_data_first, axis=0)
    min_data_second = np.amin(all_data_second, axis=0)
    min_series = np.concatenate([min_data_first,min_data_second])
    #mean plus std
    mean_plus_std = mean_series + std_dev
    #mean minus std
    mean_mins_std = (mean_series - std_dev).clip(min=0)
    #return results of analysis
    return JsonResponse({     
                    "success" : "Data analysis complete!",
                    "max" : zip(time, max_series.tolist()),
                    "min" : zip(time, min_series.tolist()),
                    "mean" : zip(time, mean_series.tolist()),
                    "mean_plus_std" : zip(time, mean_plus_std.tolist()),
                    "mean_minus_std" : zip(time, mean_mins_std.tolist()),
                   
                })

