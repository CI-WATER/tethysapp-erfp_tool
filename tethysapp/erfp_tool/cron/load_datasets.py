#!/usr/bin/env python
import datetime
import os
from shutil import rmtree

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tethys_apps.settings")
#local imports
from tethys_apps.tethysapp.erfp_tool.model import MainSettings, SettingsSessionMaker, Watershed
from dataset_manager import ERFPDatasetManager


def load_datasets():
    """
    Loads prediction datasets from data store
    """
    session = SettingsSessionMaker()
    main_settings  = session.query(MainSettings).order_by(MainSettings.id).first()
    ecmwf_rapid_prediction_location = main_settings.local_prediction_files
    for watershed in session.query(Watershed).all():
        #get data engine
        data_store = watershed.data_store
        if 'ckan' == data_store.data_store_type.code_name:
            data_manager = ERFPDatasetManager(data_store.api_endpoint,
                                   data_store.api_key,
                                   main_settings.local_prediction_files)                      
            #load current datasets
            data_manager.download_resource(watershed.folder_name, 
                                           watershed.file_name, 
                                           datetime.datetime.utcnow())

        #remove oldest datasets if more than 14 exist
        path_to_watershed_files = os.path.join(ecmwf_rapid_prediction_location,
                                               watershed.folder_name)
        try:
            prediction_directories = sorted(os.listdir(path_to_watershed_files), 
                                            reverse=True)[14:]
            for prediction_directory in prediction_directories:
                rmtree(os.path.join(path_to_watershed_files, prediction_directory))
        except OSError:
            pass
        
if __name__ == "__main__":
    load_datasets()
