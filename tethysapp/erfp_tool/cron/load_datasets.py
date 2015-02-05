# -*- coding: utf-8 -*-
import datetime
import os
import sys

sys.path.append('/usr/lib/tethys/tethys-src')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tethys_portal.settings")
#local imports
from tethys_apps.tethysapp.erfp_tool.model import MainSettings, SettingsSessionMaker, Watershed
from dataset_manager import ERFPDatasetManager


def load_datasets():
    """
    Loads prediction datasets from data store
    """
    session = SettingsSessionMaker()
    main_settings  = session.query(MainSettings).order_by(MainSettings.id).first()
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
if __name__ == "__main__":
    load_datasets()
