import datetime
from glob import glob
import netCDF4 as NET
import numpy as np
import os
from re import sub
from shutil import rmtree

def delete_old_watershed_prediction_files(watershed_name, local_prediction_files_location):
    """
    Removes old watershed prediction files from system
    """
    try:
        rmtree(os.path.join(local_prediction_files_location,
                                           watershed_name))
    except OSError:
        pass

def delete_old_watershed_files(watershed, local_prediction_files_location):
    """
    Removes old watershed files from system
    """
    old_kml_file_location = os.path.join(os.path.dirname(os.path.realpath(__file__)),
                                         'public','kml',watershed.folder_name)
    old_geoserver_drainage_line_layer = "%s-drainage_line.kml" % watershed.file_name
    old_geoserver_catchment_layer = "%s-catchment.kml" % watershed.file_name
    #remove old kml files on local server
    try:
        os.remove(os.path.join(old_kml_file_location, old_geoserver_drainage_line_layer))
        os.remove(os.path.join(old_kml_file_location, old_geoserver_catchment_layer))
        os.rmdir(old_kml_file_location)
    except OSError:
        pass
    #remove old prediction files
    delete_old_watershed_prediction_files(watershed.folder_name, 
                                          local_prediction_files_location)
   
def find_most_current_files(path_to_watershed_files, basin_name, start_folder):
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

def format_name(string):
    """
    Formats watershed name for code
    """
    formatted_string = string.strip().replace(" ", "_").lower()
    formatted_string = sub('[!@#$./?:;#%*^&()><,-]', '', formatted_string)
    formatted_string = formatted_string.replace("\"","").replace("\'","").replace("\\","")
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
    #/usr/lib/tethys/src/tethys_apps/tethysapp/erfp_tool/cron/load_datasets.py
    #/usr/lib/tethys/local/lib/python2.7/site-packages/tethys_apps/tethysapp/erfp_tool/cron/load_datasets.py
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
                              os.path.join(local_directory, 
                              'cron', 
                              'load_datasets.py'))
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
    Uploads file to specifies path
    """
    if not os.path.exists(file_path):
        os.mkdir(file_path)
        
    with open(os.path.join(file_path,file_name), 'wb+') as destination:
        for chunk in f.chunks():
            destination.write(chunk)
            

def user_permission_test(user):
    """
    User needs to be superuser or staff
    """
    return user.is_superuser or user.is_staff