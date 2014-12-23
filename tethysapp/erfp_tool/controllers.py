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
    
def find_most_current_files(path_to_watershed_files, basin_name):
    """""
    Finds the current output from downscaled ECMWF forecasts
    """""
    #check if there are any today or yesterday
    date_today = datetime.datetime.utcnow()
    date_yesterday = date_today - datetime.timedelta(1)
    possible_dates = [date_today, date_yesterday]
    possible_times = ['1200','0']
    for date in possible_dates:
        for time in possible_times:
            path_to_files = os.path.join(path_to_watershed_files,
                                         date.strftime('%Y%m%d')+'.'+time)
            if os.path.exists(path_to_files):
                basin_files = glob(os.path.join(path_to_files,
                                                "*"+basin_name+"*.nc"))
                if len(basin_files) >0:
                    hour = int(time)/100
                    return basin_files, date + datetime.timedelta(0,int(hour)*60*60)
    #there are none from yesterday or today
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

