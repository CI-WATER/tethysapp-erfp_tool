import datetime
from glob import glob
import netCDF4 as NET
import numpy as np
import os
from shutil import move
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from django.http import JsonResponse

#django imports
from django.contrib.auth.decorators import user_passes_test

#local imports
from .model import (DataStore, Geoserver, MainSettings, SettingsSessionMaker,
                    Watershed)

from .functions import (delete_old_watershed_files, find_most_current_files, 
                        format_name, get_reach_index, handle_uploaded_file,
                        user_permission_test)
                        
@user_passes_test(user_permission_test)
def data_store_add(request):
    """
    Controller for adding a data store.
    """
    if request.is_ajax() and request.method == 'POST':
        #get/check information from AJAX request
        post_info = request.POST
        data_store_name = post_info.get('data_store_name')
        print data_store_name
        data_store_type_id = post_info.get('data_store_type_id')
        print data_store_type_id
        data_store_endpoint = post_info.get('data_store_endpoint')
        print data_store_endpoint
        data_store_api_key = post_info.get('data_store_api_key')
        print data_store_api_key
    
        #initialize session
        session = SettingsSessionMaker()
        
        #check to see if duplicate exists
        num_similar_data_stores  = session.query(DataStore) \
            .filter(
                or_(
                    DataStore.name == data_store_name, 
                    DataStore.api_endpoint == data_store_endpoint
                )
            ) \
            .count()
        if(num_similar_data_stores > 0):
            return JsonResponse({ 'error': "A data store with the same name or api endpoint exists." })
            
        #add Data Store
        session.add(DataStore(data_store_name, data_store_type_id, data_store_endpoint, data_store_api_key))
        session.commit()
        
        return JsonResponse({ 'success': "Data Store Sucessfully Added!" })

    return JsonResponse({ 'error': "A problem with your request exists." })

@user_passes_test(user_permission_test)
def data_store_delete(request):
    """
    Controller for deleting a data store.
    """
    if request.is_ajax() and request.method == 'POST':
        #get/check information from AJAX request
        post_info = request.POST
        data_store_id = post_info.get('data_store_id')
    
        if int(data_store_id) != 1:
            try:
                #initialize session
                session = SettingsSessionMaker()
                #update data store
                data_store  = session.query(DataStore).get(data_store_id)
                session.delete(data_store)
                session.commit()
            except IntegrityError:
                return JsonResponse({ 'error': "This data store is connected with a watershed! Must remove connection to delete." })
            return JsonResponse({ 'success': "Data Store Sucessfully Deleted!" })
        return JsonResponse({ 'error': "Cannot change this data store." })
    return JsonResponse({ 'error': "A problem with your request exists." })

@user_passes_test(user_permission_test)
def data_store_update(request):
    """
    Controller for updating a data store.
    """
    if request.is_ajax() and request.method == 'POST':
        #get/check information from AJAX request
        post_info = request.POST
        data_store_id = post_info.get('data_store_id')
        data_store_name = post_info.get('data_store_name')
        data_store_api_endpoint = post_info.get('data_store_api_endpoint')
        data_store_api_key = post_info.get('data_store_api_key')
    
        if int(data_store_id) != 1:
            #initialize session
            session = SettingsSessionMaker()
            #update data store
            data_store  = session.query(DataStore).get(data_store_id)
            data_store.name = data_store_name
            data_store.api_endpoint= data_store_api_endpoint    
            data_store.api_key = data_store_api_key
            session.commit()
            return JsonResponse({ 'success': "Data Store Sucessfully Updated!" })
        return JsonResponse({ 'error': "Cannot change this data store." })
    return JsonResponse({ 'error': "A problem with your request exists." })

@user_passes_test(user_permission_test)
def geoserver_add(request):
    """
    Controller for adding a geoserver.
    """
    if request.is_ajax() and request.method == 'POST':
        print "POST"
        #get/check information from AJAX request
        post_info = request.POST
        geoserver_name = post_info.get('geoserver_name')
        geoserver_url = post_info.get('geoserver_url')
    
        #initialize session
        session = SettingsSessionMaker()
        
        #check to see if duplicate exists
        num_similar_geoservers  = session.query(Geoserver) \
            .filter(
                or_(
                    Geoserver.name == geoserver_name, 
                    Geoserver.url == geoserver_url
                )
            ) \
            .count()
        if(num_similar_geoservers > 0):
            return JsonResponse({ 'error': "A geoserver with the same name or url exists." })
            
        #add Data Store
        session.add(Geoserver(geoserver_name, geoserver_url))
        session.commit()
        return JsonResponse({ 'success': "Geoserver Sucessfully Added!" })

    return JsonResponse({ 'error': "A problem with your request exists." })

@user_passes_test(user_permission_test)
def geoserver_delete(request):
    """
    Controller for deleting a geoserver.
    """
    if request.is_ajax() and request.method == 'POST':
        #get/check information from AJAX request
        post_info = request.POST
        geoserver_id = post_info.get('geoserver_id')
    
        if int(geoserver_id) != 1:
            #initialize session
            session = SettingsSessionMaker()
            try:
                #update data store
                geoserver  = session.query(Geoserver).get(geoserver_id)
                session.delete(geoserver)
                session.commit()
            except IntegrityError:
                return JsonResponse({ 'error': "This geoserver is connected with a watershed! Must remove connection to delete." })
            return JsonResponse({ 'success': "Geoserver sucessfully deleted!" })
        return JsonResponse({ 'error': "Cannot change this geoserver." })
    return JsonResponse({ 'error': "A problem with your request exists." })

@user_passes_test(user_permission_test)
def geoserver_update(request):
    """
    Controller for updating a geoserver.
    """
    if request.is_ajax() and request.method == 'POST':
        #get/check information from AJAX request
        post_info = request.POST
        geoserver_id = post_info.get('geoserver_id')
        geoserver_name = post_info.get('geoserver_name')
        geoserver_url = post_info.get('geoserver_url')
    
        if int(geoserver_id) != 1:
            #initialize session
            session = SettingsSessionMaker()
            #update data store
            geoserver = session.query(Geoserver).get(geoserver_id)
            geoserver.name = geoserver_name
            geoserver.url= geoserver_url    
            session.commit()
            return JsonResponse({ 'success': "Geoserver sucessfully updated!" })
        return JsonResponse({ 'error': "Cannot change this geoserver." })
    return JsonResponse({ 'error': "A problem with your request exists." })
    
def get_avaialable_dates(request):
    """""
    Finds a list of directories with valid data and returns dates in select2 format
    """""
    if request.is_ajax() and request.method == 'GET':
        #Query DB for path to rapid output
        session = SettingsSessionMaker()
        main_settings  = session.query(MainSettings).order_by(MainSettings.id).first()
        path_to_rapid_output = main_settings.local_prediction_files
        if not os.path.exists(path_to_rapid_output):
            return JsonResponse({'error' : 'Location of RAPID output files faulty. Please check settings.'})    
    
        #get/check information from AJAX request
        get_info = request.GET
        watershed_name = format_name(get_info['watershed_name']) if 'watershed_name' in get_info else None
        subbasin_name = format_name(get_info['subbasin_name']) if 'subbasin_name' in get_info else None
        reach_id = get_info.get('reach_id')
        if not reach_id or not watershed_name or not subbasin_name:
            return JsonResponse({'error' : 'AJAX request input faulty'})
    
        #find/check current output datasets    
        path_to_watershed_files = os.path.join(path_to_rapid_output, watershed_name)
        directories = sorted(os.listdir(path_to_watershed_files), reverse=True)
        output_directories = []
        directory_count = 0
        for directory in directories:    
            date = datetime.datetime.strptime(directory.split(".")[0],"%Y%m%d")
            time = directory.split(".")[-1]
            path_to_files = os.path.join(path_to_watershed_files, directory)
            if os.path.exists(path_to_files):
                basin_files = glob(os.path.join(path_to_files,
                                                "*"+subbasin_name+"*.nc"))
                #only add directory to the list if valid                                    
                if len(basin_files) >0 and get_reach_index(reach_id, basin_files):
                    hour = int(time)/100
                    output_directories.append({
                        'id' : directory, 
                        'text' : str(date + datetime.timedelta(0,int(hour)*60*60))
                    })
                    directory_count += 1
                #limit number of directories
                if(directory_count>64):
                    break                
        if len(output_directories)>0:
            return JsonResponse({     
                        "success" : "Data analysis complete!",
                        "output_directories" : output_directories,                   
                    })
        else:
            return JsonResponse({'error' : 'Recent forecasts for reach with id: ' + str(reach_id) + ' not found.'})    
     
def get_hydrograph(request):
    """""
    Plots all 52 ensembles with min, max, avg
    """""
    if request.is_ajax() and request.method == 'GET':
        #Query DB for path to rapid output
        session = SettingsSessionMaker()
        main_settings  = session.query(MainSettings).order_by(MainSettings.id).first()
        path_to_rapid_output = main_settings.local_prediction_files
        if not os.path.exists(path_to_rapid_output):
            return JsonResponse({'error' : 'Location of RAPID output files faulty. Please check settings.'})    
    
        #get/check information from AJAX request
        get_info = request.GET
        watershed_name = format_name(get_info['watershed_name']) if 'watershed_name' in get_info else None
        subbasin_name = format_name(get_info['subbasin_name']) if 'subbasin_name' in get_info else None
        reach_id = get_info.get('reach_id')
        start_folder = get_info.get('start_folder')
        
        if not reach_id or not watershed_name or not subbasin_name:
            return JsonResponse({'error' : 'AJAX request input faulty.'})
    
        #find/check current output datasets    
        path_to_output_files = os.path.join(path_to_rapid_output, watershed_name)
        basin_files, start_date = find_most_current_files(path_to_output_files,subbasin_name,start_folder)
        if not basin_files or not start_date:
            return JsonResponse({'error' : 'Recent forecast not found.'})
    
        #get/check the index of the reach
        reach_index = get_reach_index(reach_id, basin_files)
        if not reach_index:
            return JsonResponse({'error' : 'Reach with id: ' + str(reach_id) + ' not found.'})    
    
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
                    
@user_passes_test(user_permission_test)
def settings_update(request):
    """
    Controller for updating the settings.
    """
    if request.is_ajax() and request.method == 'POST':
        #get/check information from AJAX request
        post_info = request.POST
        base_layer_id = post_info.get('base_layer_id')
        api_key = post_info.get('api_key')
        local_prediction_files = post_info.get('ecmwf_rapid_location')
        #initialize session
        session = SettingsSessionMaker()
        
        #update main settings
        main_settings  = session.query(MainSettings).order_by(MainSettings.id).first()
        main_settings.base_layer_id = base_layer_id
        main_settings.local_prediction_files = local_prediction_files    
        main_settings.base_layer.api_key = api_key
        session.commit()
        
        return JsonResponse({ 'success': "Settings Sucessfully Updated!" })

@user_passes_test(user_permission_test)    
def watershed_add(request):
    """
    Controller for ading a watershed.
    """
    if request.is_ajax() and request.method == 'POST':
        post_info = request.POST
        #get/check information from AJAX request
        watershed_name = format_name(post_info.get('watershed_name'))
        subbasin_name = format_name(post_info.get('subbasin_name'))
        data_store_id = post_info.get('data_store_id')
        geoserver_id = post_info.get('geoserver_id')
        geoserver_drainage_line_layer = post_info.get('geoserver_drainage_line_layer')
        geoserver_catchment_layer = post_info.get('geoserver_catchment_layer')
        if not watershed_name or not subbasin_name or not data_store_id \
            or not geoserver_drainage_line_layer or not geoserver_catchment_layer:
            return JsonResponse({'error' : 'AJAX request input faulty'})
       #file_form = KMLUploadFileForm(request.POST,request.FILES)
        #if file_form.is_valid():
        if(int(geoserver_id) == 1):
            if 'drainage_line_kml_file' in request.FILES and 'catchment_kml_file' in request.FILES:
                kml_file_location = os.path.join(os.path.dirname(os.path.realpath(__file__)),'public','kml',format_name(watershed_name))
                geoserver_drainage_line_layer = format_name(subbasin_name) + "-drainage_line.kml"
                handle_uploaded_file(request.FILES.get('drainage_line_kml_file'),kml_file_location, geoserver_drainage_line_layer)
                geoserver_catchment_layer = format_name(subbasin_name) + "-catchment.kml"
                handle_uploaded_file(request.FILES.get('catchment_kml_file'),kml_file_location, geoserver_catchment_layer)
            else:
                return JsonResponse({ 'error': "File Upload Failed! Please check your KML files." })

        #initialize session
        session = SettingsSessionMaker()
        
        #check to see if duplicate exists
        num_similar_watersheds  = session.query(Watershed) \
            .filter(Watershed.watershed_name == watershed_name) \
            .filter(Watershed.subbasin_name == subbasin_name) \
            .count()
        if(num_similar_watersheds > 0):
            return JsonResponse({ 'error': "A watershed with the same name exists." })
            
        #add Data Store
        session.add(Watershed(watershed_name, subbasin_name, data_store_id, geoserver_id, geoserver_drainage_line_layer, geoserver_catchment_layer))
        session.commit()
        
        return JsonResponse({ 'success': "Watershed Sucessfully Added!" })

    return JsonResponse({ 'error': "A problem with your request exists." })

@user_passes_test(user_permission_test)
def watershed_delete(request):
    """
    Controller for deleting a watershed.
    """
    if request.is_ajax() and request.method == 'POST':
        #get/check information from AJAX request
        post_info = request.POST
        watershed_id = post_info.get('watershed_id')
    
        
        if watershed_id:
            #initialize session
            session = SettingsSessionMaker()
            #get watershed to delete
            watershed  = session.query(Watershed).get(watershed_id)
            
            #remove watershed kml files
            delete_old_watershed_files(watershed.watershed_name, watershed.subbasin_name)
                
            #delete watershed from database
            session.delete(watershed)
            session.commit()

            return JsonResponse({ 'success': "Watershed sucessfully deleted!" })
        return JsonResponse({ 'error': "Cannot delete this watershed." })
    return JsonResponse({ 'error': "A problem with your request exists." })
    
@user_passes_test(user_permission_test)
def watershed_update(request):
    """
    Controller for updating a watershed.
    """
    if request.is_ajax() and request.method == 'POST':
        post_info = request.POST
        #get/check information from AJAX request
        watershed_id = post_info.get('watershed_id')
        watershed_name = format_name(post_info.get('watershed_name'))
        subbasin_name = format_name(post_info.get('subbasin_name'))
        data_store_id = post_info.get('data_store_id')
        geoserver_id = post_info.get('geoserver_id')
        geoserver_drainage_line_layer = post_info.get('geoserver_drainage_line_layer')
        geoserver_catchment_layer = post_info.get('geoserver_catchment_layer')

        if not watershed_id or not watershed_name or not subbasin_name or not data_store_id \
            or not geoserver_id or not geoserver_drainage_line_layer or not geoserver_catchment_layer:
            return JsonResponse({'error' : 'AJAX request input faulty'})
            
        #initialize session
        session = SettingsSessionMaker()
        
        #get desired watershed
        watershed  = session.query(Watershed).get(watershed_id)

        #upload files to local server if ready
        if(int(geoserver_id) == 1):
            old_kml_file_location = os.path.join(os.path.dirname(os.path.realpath(__file__)),'public','kml',format_name(watershed.watershed_name))
            new_kml_file_location = os.path.join(os.path.dirname(os.path.realpath(__file__)),'public','kml',format_name(watershed_name))
            geoserver_drainage_line_layer = subbasin_name + "-drainage_line.kml"
            geoserver_catchment_layer = subbasin_name + "-catchment.kml"
            #add new directory if it does not exist                
            try:
                os.mkdir(new_kml_file_location)
            except OSError:
                pass

            #if the name of watershed or subbasin is changed, update file name/location
            if(watershed_name != watershed.watershed_name or subbasin_name != watershed.subbasin_name):
                #move drainage line kml
                old_geoserver_drainage_line_layer = format_name(watershed.subbasin_name) + "-drainage_line.kml"
                move(os.path.join(old_kml_file_location, old_geoserver_drainage_line_layer),
                     os.path.join(new_kml_file_location, geoserver_drainage_line_layer))
                #move catchment kml
                old_geoserver_catchment_layer = format_name(watershed.subbasin_name) + "-catchment.kml"
                move(os.path.join(old_kml_file_location, old_geoserver_catchment_layer),
                     os.path.join(new_kml_file_location, geoserver_catchment_layer))
                #remove old directory if exists
                try:
                    os.rmdir(old_kml_file_location)
                except OSError:
                    pass
            else:
                #remove old files if they exist
                delete_old_watershed_files(watershed.watershed_name, watershed.subbasin_name)
                #upload new files if they exist
                if('drainage_line_kml_file' in request.FILES):
                    handle_uploaded_file(request.FILES.get('drainage_line_kml_file'),new_kml_file_location, geoserver_drainage_line_layer)
                if('catchment_kml_file' in request.FILES):
                    handle_uploaded_file(request.FILES.get('catchment_kml_file'),new_kml_file_location, geoserver_catchment_layer)
        else:
            #remove old files if not on local server
            delete_old_watershed_files(watershed.watershed_name, watershed.subbasin_name)
            
        
        #change watershed attributes
        watershed.watershed_name = watershed_name
        watershed.subbasin_name = subbasin_name
        watershed.data_store_id = data_store_id
        watershed.geoserver_id = geoserver_id
        watershed.geoserver_drainage_line_layer = geoserver_drainage_line_layer
        watershed.geoserver_catchment_layer = geoserver_catchment_layer
        
        #update database
        session.commit()
        
        return JsonResponse({ 'success': "Watershed sucessfully updated!" })

    return JsonResponse({ 'error': "A problem with your request exists." })
