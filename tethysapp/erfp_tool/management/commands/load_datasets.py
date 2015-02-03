# -*- coding: utf-8 -*-
import datetime
from django.core.management.base import BaseCommand
#local imports
from tethys_apps.tethysapp.erfp_tool.model import MainSettings, SettingsSessionMaker, Watershed
from dataset_manager import ERFPDatasetManager

class Command(BaseCommand):
    """
    Loads prediction datasets from data store
    """
    help = "Loads ECMWF-RAPID datasets for the app to read."
    def handle(self):
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
                today = datetime.datetime.utcnow()
                hour = '1200' if today.hour > 11 else '0'
                date_string = '%s.%s' % (today.strftime("%Y%m%d"), hour)                          
                data_manager.download_resource(watershed.folder_name, 
                                               watershed.file_name, 
                                               today.year,
                                               today.month, 
                                               date_string)  