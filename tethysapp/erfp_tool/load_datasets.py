#!/usr/bin/env python
import os
from shutil import rmtree

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tethys_apps.settings")
#local imports
from tethys_apps.tethysapp.erfp_tool.model import (MainSettings, 
                                                   SettingsSessionMaker, 
                                                   Watershed)
from sfpt_dataset_manager.dataset_manager import (ECMWFRAPIDDatasetManager, 
                                                  WRFHydroHRRRDatasetManager)
                                                  
def download_single_watershed_ecmwf_data(watershed, 
                                         ecmwf_rapid_prediction_directory):
    """
    Loads single watersheds ECMWF datasets from data store
    """
    if ecmwf_rapid_prediction_directory \
        and os.path.exists(ecmwf_rapid_prediction_directory) \
        and watershed.ecmwf_data_store_watershed_name \
        and watershed.ecmwf_data_store_subbasin_name:
            
        #get data engine
        data_store = watershed.data_store
        if 'ckan' == data_store.data_store_type.code_name:
            #get dataset managers
            data_manager = ECMWFRAPIDDatasetManager(data_store.api_endpoint,
                                                    data_store.api_key)    
            #load current datasets
            data_manager.download_recent_resource(watershed.ecmwf_data_store_watershed_name, 
                                                  watershed.ecmwf_data_store_subbasin_name,
                                                  ecmwf_rapid_prediction_directory)
    
        path_to_predicitons = os.path.join(ecmwf_rapid_prediction_directory, 
                                           watershed.ecmwf_data_store_watershed_name, 
                                           watershed.ecmwf_data_store_subbasin_name)
        if os.path.exists(path_to_predicitons):
            #remove oldest datasets if more than 14 exist
            try:
                prediction_directories = sorted(os.listdir(path_to_predicitons), 
                                                reverse=True)[14:]
                for prediction_directory in prediction_directories:
                    rmtree(os.path.join(path_to_predicitons, prediction_directory))
            except OSError:
                pass

def download_single_watershed_wrf_hydro_data(watershed, 
                                             wrf_hydro_rapid_prediction_directory):
    """
    Loads single watersheds WRF-Hydro datasets from data store
    """
    if wrf_hydro_rapid_prediction_directory \
        and os.path.exists(wrf_hydro_rapid_prediction_directory) \
        and watershed.wrf_hydro_data_store_watershed_name \
        and watershed.wrf_hydro_data_store_subbasin_name:
        #get data engine
        data_store = watershed.data_store
        if 'ckan' == data_store.data_store_type.code_name:
            #get dataset managers
            data_manager = WRFHydroHRRRDatasetManager(data_store.api_endpoint,
                                                      data_store.api_key)
            #load current datasets
            data_manager.download_recent_resource(watershed.wrf_hydro_data_store_watershed_name, 
                                                  watershed.wrf_hydro_data_store_subbasin_name,
                                                  wrf_hydro_rapid_prediction_directory)
    
        path_to_predicitons = os.path.join(wrf_hydro_rapid_prediction_directory, 
                                           watershed.wrf_hydro_data_store_watershed_name, 
                                           watershed.wrf_hydro_data_store_subbasin_name)
    
        if os.path.exists(path_to_predicitons):
            #remove oldest datasets if more than 24 exist
            try:
                prediction_files = sorted(os.listdir(path_to_predicitons), 
                                                reverse=True)[24:]
                for prediction_file in prediction_files:
                    rmtree(os.path.join(path_to_predicitons, prediction_file))
            except OSError:
                pass


def load_datasets():
    """
    Loads ECMWF prediction datasets from data store for all watersheds
    """
    session = SettingsSessionMaker()
    main_settings  = session.query(MainSettings).order_by(MainSettings.id).first()

    ecmwf_rapid_prediction_directory = main_settings.ecmwf_rapid_prediction_directory
    if ecmwf_rapid_prediction_directory and os.path.exists(ecmwf_rapid_prediction_directory):
        for watershed in session.query(Watershed).all():
            download_single_watershed_ecmwf_data(watershed, ecmwf_rapid_prediction_directory)
    else:
        print "ECMWF prediction location invalid. Please set to continue."
        
    wrf_hydro_rapid_prediction_directory = main_settings.wrf_hydro_rapid_prediction_directory
    if wrf_hydro_rapid_prediction_directory and \
        os.path.exists(wrf_hydro_rapid_prediction_directory):
        for watershed in session.query(Watershed).all():
            download_single_watershed_wrf_hydro_data(watershed, 
                                                     wrf_hydro_rapid_prediction_directory)
    else:
        print "WRF-Hydro prediction location invalid. Please set to continue."

def load_watershed(watershed):
    """
    Loads prediction datasets from data store for one watershed
    """
    session = SettingsSessionMaker()
    main_settings  = session.query(MainSettings).order_by(MainSettings.id).first()

    if main_settings.ecmwf_rapid_prediction_directory and \
        os.path.exists(main_settings.ecmwf_rapid_prediction_directory):
            
        download_single_watershed_ecmwf_data(watershed, 
                                             main_settings.ecmwf_rapid_prediction_directory)
    else:
        print "ECMWF prediction location invalid. Please set to continue."

    if main_settings.wrf_hydro_rapid_prediction_directory and \
        os.path.exists(main_settings.wrf_hydro_rapid_prediction_directory):
            
        download_single_watershed_wrf_hydro_data(watershed, 
                                                 main_settings.wrf_hydro_rapid_prediction_directory)
    else:
        print "WRF-Hydro prediction location invalid. Please set to continue."
    
        
if __name__ == "__main__":
    load_datasets()
    """
    engine_url = 'http://ciwckan.chpc.utah.edu'
    api_key = '8dcc1b34-0e09-4ddc-8356-df4a24e5be87'
    #ECMWF
    er_manager = ECMWFRAPIDDatasetManager(engine_url, api_key)
    er_manager.download_prediction_resource(watershed='magdalena', 
                                            subbasin='el_banco', 
                                            date_string='20150505.0', 
                                            extract_directory='/home/alan/work/magdalena/20150505.0')
    #WRF-Hydro
    wr_manager = WRFHydroHRRRDatasetManager(engine_url, api_key)
    wr_manager.download_prediction_resource(watershed='usa', 
                                            subbasin='usa', 
                                            date_string='20150405T2300Z', 
                                            extract_directory='/home/alan/tethysdev/tethysapp-erfp_tool/wrf_hydro_rapid_predictions/usa')
    """ 
