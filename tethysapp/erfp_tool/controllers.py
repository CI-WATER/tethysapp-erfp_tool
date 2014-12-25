import datetime
from django.http import JsonResponse
from django.shortcuts import render
import fnmatch
from glob import glob
import json
import netCDF4 as NET
import numpy as np
import os

def home(request):
    """
    Controller for the app home page.
    """
    ##find all kml files to add to page    
    kml_file_location = os.path.join(os.path.dirname(os.path.realpath(__file__)),'public','kml')
    
    catchment_kml_urls = []
    drainage_line_kml_urls = []
    for dirpath, dirnames, files in os.walk(kml_file_location):
        for kml_file in fnmatch.filter(files, '*catchment.kml'):
            catchment_kml_urls.append('/static/erfp_tool/kml/%s/%s' % (os.path.basename(dirpath), kml_file))
        for kml_file in fnmatch.filter(files, '*drainage_line.kml'):
            drainage_line_kml_urls.append('/static/erfp_tool/kml/%s/%s' % (os.path.basename(dirpath), kml_file))

    context = {
                'catchment_kml_urls' : json.dumps(catchment_kml_urls),
                'drainage_line_kml_urls' : json.dumps(drainage_line_kml_urls)
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
                'display_text': 'Watershed Name (this is the name in the CKAN server or folder name on local instance)',
                'name': 'watershed-name-input',
                'placeholder': 'e.g.: magdalena'
              }
    subbasin_name_input = {
                'display_text': 'Subbasin Name (this is the name in the CKAN server or folder name on local instance)',
                'name': 'subbasin-name-input',
                'placeholder': 'e.g.: el_banco'
              }
    geoserver_location_input = {
                'display_text': 'Geoserver Location',
                'name': 'geoserver-location-input',
                'placeholder': 'e.g.: http://felek.cns.umass.edu:8080/geoserver/wms'
              }
    geoserver_layers_input = {
                'display_text': 'Geoserver KML Layer',
                'name': 'geoserver-layers-input',
                'placeholder': 'e.g.: Streams:Developed'
              }
              
    ckan_name_input = {
                'display_text': 'CKAN Server Name',
                'name': 'ckan-name-input',
                'placeholder': 'e.g.: My CKAN Server'
              }
    ckan_endpoint_input = {
                'display_text': 'CKAN API Endpoint',
                'name': 'ckan-endpoint-input',
                'placeholder': 'e.g.: http://ciwweb.chpc.utah.edu/api/3/action'
              }
    ckan_api_key_input = {
                'display_text': 'CKAN API Key',
                'name': 'ckan-api-key-input',
                'placeholder': 'e.g.: a1b2c3-d4e5d6-f7g8h9'
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
                'geoserver_location_input': geoserver_location_input,
                'geoserver_layers_input': geoserver_layers_input,
                'ckan_name_input': ckan_name_input,
                'ckan_endpoint_input': ckan_endpoint_input,
                'ckan_api_key_input': ckan_api_key_input,
                'add_button': add_button,
              }

    return render(request, 'erfp_tool/add_watershed.html', context)
    
def find_most_current_files(path_to_watershed_files, basin_name):
    """""
    Finds the current output from downscaled ECMWF forecasts
    """""
    directory = sorted(os.listdir(path_to_watershed_files))[-1]
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

