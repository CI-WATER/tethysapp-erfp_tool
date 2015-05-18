import datetime
from glob import glob
import netCDF4 as NET
import numpy as np
import os
import re
from shutil import rmtree
#tethys imports
from tethys_dataset_services.engines import GeoServerSpatialDatasetEngine
#local import
from sfpt_dataset_manager.dataset_manager import CKANDatasetManager

def check_shapefile_input_files(shp_files):
    """
    #make sure required files for shapefiles are included
    """
    required_extentsions = ['.shp', '.shx', '.prj','.dbf']
    accepted_extensions = []
    for shp_file in shp_files:
        file_name, file_extension = os.path.splitext(shp_file.name)
        for required_extentsion in required_extentsions: 
            if file_extension == required_extentsion:
                accepted_extensions.append(required_extentsion)
                required_extentsions.remove(required_extentsion)
    return required_extentsions

def rename_shapefile_input_files(shp_files, new_file_name):
    """
    #make sure required files for shapefiles are included
    """
    for shp_file in shp_files:
        file_name, file_extension = os.path.splitext(shp_file.name)
        shp_file.name = "%s%s" % (new_file_name, file_extension)
    
def delete_old_watershed_prediction_files(folder_name, local_prediction_files_location):
    """
    Removes old watershed prediction files from system
    """
    try:
        rmtree(os.path.join(local_prediction_files_location,
                                           folder_name))
    except OSError:
        pass

def delete_old_watershed_kml_files(watershed):
    """
    Removes old watershed kml files from system
    """
    old_kml_file_location = os.path.join(os.path.dirname(os.path.realpath(__file__)),
                                         'public','kml',watershed.folder_name)
    #remove old kml files on local server
    #drainange line
    try:
        if watershed.kml_drainage_line_layer:
            os.remove(os.path.join(old_kml_file_location, 
                                   watershed.kml_drainage_line_layer))
    except OSError:
        pass
    #catchment
    try:
        if watershed.kml_catchment_layer:
            os.remove(os.path.join(old_kml_file_location, 
                                   watershed.kml_catchment_layer))
    except OSError:
        pass
    #gage
    try:
        if watershed.kml_gage_layer:
            os.remove(os.path.join(old_kml_file_location, 
                                   watershed.kml_gage_layer))
    except OSError:
        pass
    #folder
    try:
        os.rmdir(old_kml_file_location)
    except OSError:
        pass

def delete_old_watershed_geoserver_files(watershed):
    """
    Removes old watershed geoserver files from system
    """
    engine = GeoServerSpatialDatasetEngine(endpoint="%s/rest" % watershed.geoserver.url, 
                           username=watershed.geoserver.username,
                           password=watershed.geoserver.password)

    if watershed.geoserver_drainage_line_uploaded:
        engine.delete_layer(watershed.geoserver_drainage_line_layer)
    if watershed.geoserver_catchment_uploaded:
        engine.delete_layer(watershed.geoserver_catchment_layer)
    if watershed.geoserver_gage_uploaded:
        engine.delete_layer(watershed.geoserver_gage_layer)

def delete_old_watershed_files(watershed, local_prediction_files_location):
    """
    Removes old watershed files from system
    """
    #remove old kml files
    delete_old_watershed_kml_files(watershed)
    #remove old geoserver files
    delete_old_watershed_geoserver_files(watershed)
    #remove old prediction files
    delete_old_watershed_prediction_files(watershed.folder_name, 
                                          local_prediction_files_location)
    #remove RAPID input files on CKAN
    data_store = watershed.data_store
    if 'ckan' == data_store.data_store_type.code_name:
        #get dataset managers
        data_manager = CKANDatasetManager(data_store.api_endpoint,
                                          data_store.api_key,
                                          "ecmwf"
                                          )
        data_manager.dataset_engine.delete_resource(watershed.ecmwf_rapid_input_resource_id)

def ecmwf_find_most_current_files(path_to_watershed_files, basin_name, start_folder):
    """""
    Finds the current output from downscaled ECMWF forecasts
    """""
    if(start_folder=="most_recent"):
        if not os.path.exists(path_to_watershed_files):
            return None, None
        directories = sorted([d for d in os.listdir(path_to_watershed_files) \
                             if os.path.isdir(os.path.join(path_to_watershed_files, d))],
                             reverse=True)
    else:
        directories = [start_folder]
    for directory in directories:
        try:
            date = datetime.datetime.strptime(directory.split(".")[0],"%Y%m%d")
            time = directory.split(".")[-1]
            path_to_files = os.path.join(path_to_watershed_files, directory)
            if os.path.exists(path_to_files):
                basin_files = glob(os.path.join(path_to_files,
                                                "*"+basin_name+"*.nc"))
                if len(basin_files)>0:
                    hour = int(time)/100
                    return basin_files, date + datetime.timedelta(0,int(hour)*60*60)
        except Exception as ex:
            print ex
            pass
    #there are no files found
    return None, None

def wrf_hydro_find_most_current_file(path_to_watershed_files, date_string):
    """""
    Finds the current output from downscaled WRF-Hydro forecasts
    """""
    if(date_string=="most_recent"):
        if not os.path.exists(path_to_watershed_files):
            return None
        prediction_files = sorted([d for d in os.listdir(path_to_watershed_files) \
                        if not os.path.isdir(os.path.join(path_to_watershed_files, d))],
                        reverse=True)
    else:
        #RapidResult_20150405T2300Z_CF.nc
        prediction_files = ["RapidResult_%s_CF.nc" % date_string]
    for prediction_file in prediction_files:
        try:
            path_to_file = os.path.join(path_to_watershed_files, prediction_file)
            if os.path.exists(path_to_file):
                return path_to_file
        except Exception as ex:
            print ex
            pass
    #there are no files found
    return None

def format_name(string):
    """
    Formats watershed name for code
    """
    if string:
        formatted_string = string.strip().replace(" ", "_").lower()
        formatted_string = re.sub(r'[^a-zA-Z0-9_-]', '', formatted_string)
        while formatted_string.startswith("-") or formatted_string.startswith("_"):
            formatted_string = formatted_string[1:]
    else:
        formatted_string = ""
    return formatted_string

def format_watershed_title(watershed, subbasin):
    """
    Formats title for watershed in navigation
    """
    max_length = 30
    watershed = watershed.strip()
    subbasin = subbasin.strip()
    watershed_length = len(watershed)
    if(watershed_length>max_length):
        return watershed[:max_length-1].strip() + "..."
    max_length -= watershed_length
    subbasin_length = len(subbasin)
    if(subbasin_length>max_length):
        return (watershed + " (" + subbasin[:max_length-3].strip() + " ...)")
    return (watershed + " (" + subbasin + ")")

def get_cron_command():
    """
    Gets cron command for downloading datasets
    """
    #/usr/lib/tethys/src/tethys_apps/tethysapp/erfp_tool/cron/load_datasets.py
    local_directory = os.path.dirname(os.path.abspath(__file__))
    delimiter = ""
    if "/" in local_directory:
        delimiter = "/"
    elif "\\" in local_directory:
        delimiter = "\\"
    virtual_env_path = ""
    if delimiter and local_directory:
        virtual_env_path = delimiter.join(local_directory.split(delimiter)[:-4])
        command = '%s %s' % (os.path.join(virtual_env_path,'bin','python'), 
                              os.path.join(local_directory, 'load_datasets.py'))
        return command
    else:
        return None

def get_reach_index(reach_id, guess_index, basin_files):
    """
    Gets the index of the reach from the COMID 
    """
    data_nc = NET.Dataset(basin_files[0], mode="r")
    com_ids = data_nc.variables['COMID'][:]
    data_nc.close()
    try:
        if guess_index:
            if int(reach_id) == int(com_ids[int(guess_index)]):
                return int(guess_index)
    except Exception as ex:
        print ex
        pass
    
    try:
        reach_index = np.where(com_ids==int(reach_id))[0][0]
    except Exception as ex:
        print ex
        reach_index = None
        pass
    return reach_index                

def get_subbasin_list(file_path):
    """
    Gets a list of subbasins in the watershed
    """
    subbasin_list = []
    drainage_line_kmls = glob(os.path.join(file_path, '*drainage_line.kml'))
    for drainage_line_kml in drainage_line_kmls:
        subbasin_name = "-".join(os.path.basename(drainage_line_kml).split("-")[:-1])
        if subbasin_name not in subbasin_list:
            subbasin_list.append(subbasin_name)
    catchment_kmls = glob(os.path.join(file_path, '*catchment.kml'))
    for catchment_kml in catchment_kmls:
        subbasin_name = "-".join(os.path.basename(catchment_kml).split("-")[:-1])
        if subbasin_name not in subbasin_list:
            subbasin_list.append(subbasin_name)
    subbasin_list.sort()
    return subbasin_list
   
def handle_uploaded_file(f, file_path, file_name):
    """
    Uploads file to specified path
    """
    #remove old file if exists
    try:
        os.remove(os.path.join(file_path, file_name))
    except OSError:
        pass
    #make directory
    if not os.path.exists(file_path):
        os.mkdir(file_path)
    #upload file    
    with open(os.path.join(file_path,file_name), 'wb+') as destination:
        for chunk in f.chunks():
            destination.write(chunk)
            

def user_permission_test(user):
    """
    User needs to be superuser or staff
    """
    return user.is_superuser or user.is_staff