#!/usr/bin/env python
#coding: utf-8 
import datetime
from glob import glob
import os
import re
import requests
from shutil import rmtree
import tarfile
import zipfile

from tethys_dataset_services.engines import CkanDatasetEngine
import traceback
#local imports
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tethys_apps.settings")
from tethys_apps.tethysapp.erfp_tool.model import SettingsSessionMaker, MainSettings

class ERFPDatasetManager():
    """
    This class is used to find and download, zip and upload prediction files from/to a data server
    """
    def __init__(self, engine_url, api_key, output_files_location):
        if engine_url.endswith('/'):
            engine_url = engine_url[:-1]
        if not engine_url.endswith('api/action') and not engine_url.endswith('api/3/action'):
            engine_url += '/api/action'
        self.dataset_engine = CkanDatasetEngine(endpoint=engine_url, apikey=api_key)
        self.output_files_location = output_files_location

    def make_tarfiles(self, source_dir, watershed):
        """
        This function packages all of the datasets in to tar.gz files and
        returns their attributes
        """
        all_info = []
        basin_name_search = re.compile(r'Qout_(\w+)_[a-zA-Z\d]+.nc')
        basin_files = glob(os.path.join(source_dir,'Qout_*.nc'))
        base_path = os.path.dirname(source_dir)
        base_name = os.path.basename(source_dir)
        basin_names = []
        #get info for waterhseds
        for basin_file in basin_files:
            try:
                basin_name = basin_name_search.search(basin_file).group(1)
                if basin_name not in basin_names:
                    output_filename =  os.path.join(base_path, "%s-%s.tar.gz" % (basin_name, base_name))
                    basin_names.append(basin_name)
                    date = datetime.datetime.strptime(base_name[:8],"%Y%m%d")
                    all_info.append({
                                    'watershed':watershed,
                                    'subbasin':basin_name,
                                    'date_string': base_name,
                                    'year': date.year,
                                    'month' : date.month,
                                    'file_to_upload': output_filename,
                                    })
            except AttributeError:
                # basin name not found - do nothing
                pass
    
        for basin_name in basin_names:
            basin_files = glob(os.path.join(source_dir,'Qout_%s*.nc' % basin_name))
            output_filename =  os.path.join(base_path, "%s-%s.tar.gz" % (basin_name, base_name))
            if not os.path.exists(output_filename):
                with tarfile.open(output_filename, "w:gz") as tar:
                    for basin_file in basin_files:
                        tar.add(basin_file, arcname=os.path.basename(basin_file))
            
                    
    
    
        return all_info
    
    def get_dataset_id(self, watershed, subbasin, year, month):
        """
        This function gets the id of a dataset
        """
        find_dataset_dict = {
            'name': 'erfp-%s-%s-%s-%s' % (watershed, subbasin, year, month),
        }
    
        # Use the json module to load CKAN's response into a dictionary.
        response_dict = self.dataset_engine.search_datasets(find_dataset_dict)
        
        if response_dict['success']:
            if int(response_dict['result']['count']) > 0:
                return response_dict['result']['results'][0]['id']
            return None
        else:
            return None

    def create_dataset(self, watershed, subbasin, year, month):
        """
        This function creates a dataset if it does not exist
        """
        dataset_id = self.get_dataset_id(watershed, subbasin, year, month)
        #check if dataset exists
        if not dataset_id:
            #if it does not exist, create the dataset
            result = self.dataset_engine.create_dataset(name='erfp-%s-%s-%s-%s' % 
                                                        (watershed, subbasin, year, month),
                                          notes='This dataset contians NetCDF3 files produced by'
                                                  'downscalsing ECMWF forecasts and routing them with RAPID', 
                                          version='1.0', 
                                          tethys_app='erfp_tool', 
                                          waterhsed=watershed,
                                          subbasin=subbasin,
                                          month=month,
                                          year=year)
            dataset_id = result['result']['id']
        return dataset_id
       
    def upload_resource(self, dataset_info):
        """
        This function uploads a resource to a dataset if it does not exist
        """
        #create dataset for each watershed-subbasin combo if needed
        dataset_id = self.create_dataset(dataset_info['watershed'], 
                       dataset_info['subbasin'], 
                       dataset_info['year'], 
                       dataset_info['month'])
        if dataset_id:
            #check if dataset already exists
            resource_name = 'erfp-%s-%s-%s' % (dataset_info['watershed'],
                                                dataset_info['subbasin'],
                                                dataset_info['date_string'])
            resource_results = self.dataset_engine.search_resources({'name':resource_name},datset_id=dataset_id)
            try:
                if resource_results['result']['count'] <=0:
                    #upload resources to the dataset
                    self.dataset_engine.create_resource(dataset_id, 
                                                    name=resource_name, 
                                                    file=dataset_info['file_to_upload'],
                                                    format='tar.gz', 
                                                    tethys_app="erfp_tool",
                                                    watershed=dataset_info['watershed'],
                                                    subbasin=dataset_info['subbasin'],
                                                    forecast_date=dataset_info['date_string'],
                                                    description="ECMWF-RAPID Flood Predicition Dataset")
            except Exception,e:
                print e
                pass
         
    def zip_upload_packages(self):
        """
        This function uploads a resource to a dataset if it does not exist
        """
        datasets_info = []
        #zip file and get dataset information
        watersheds = [d for d in os.listdir(self.output_files_location) \
                        if os.path.isdir(os.path.join(self.output_files_location, d))]
        for watershed in watersheds:
            print "Zipping files for watershed: %s" % watershed
            watershed_path = os.path.join(self.output_files_location, watershed)
            datasets = [d for d in os.listdir(watershed_path) \
                            if os.path.isdir(os.path.join(watershed_path, d))]
            for dataset in datasets:
                dataset_directory = os.path.join(watershed_path, dataset)
                all_info = self.make_tarfiles(dataset_directory, watershed)
                datasets_info += all_info
        print "Finished zipping files"
        print "Uploading datasets"
        for dataset_info in datasets_info:
            self.upload_resource(dataset_info)
        print "Finished uploading datasets"
            
    def get_resource_info(self, watershed, subbasin, year, month, date_string):
        """
        This function gets the info of a resource
        """
        dataset_id = self.get_dataset_id(watershed, subbasin, year, month)
        if dataset_id:
            #check if dataset already exists
            resource_name = 'erfp-%s-%s-%s' % (watershed,
                                                subbasin,
                                                date_string)
            resource_results = self.dataset_engine.search_resources({'name':resource_name},
                                                                    datset_id=dataset_id)
            try:
                if resource_results['result']['count'] > 0:
                    #upload resources to the dataset
                    return resource_results['result']['results'][0]
            except Exception,e:
                print e
                pass
        return None
    
    def download_resource(self, watershed, subbasin, today_datetime):
        iteration = 0
        download_file = False
        while not download_file and iteration < 3:
            days_back = 1 if iteration >= 2 else 0
            hours_back = 12 if iteration == 1 else 0
            today =  today_datetime - datetime.timedelta(days_back,hours_back*60*60)
            hour = '1200' if today.hour > 11 else '0'
            date_string = '%s.%s' % (today.strftime("%Y%m%d"), hour)
            resource_info = self.get_resource_info(watershed, subbasin, today.year, 
                                                   today.month, date_string)
            if resource_info and self.output_files_location and os.path.exists(self.output_files_location):
                extract_dir = os.path.join(self.output_files_location, watershed, date_string)
                #only download if it does not exist already
                if os.path.exists(extract_dir):
                    basin_files = glob(os.path.join(extract_dir,'Qout_%s*.nc' % subbasin))
                    if not basin_files:
                        download_file = True
                else:
                    download_file = True
            iteration += 1
                    
        if download_file:
            #create directory
            try:
                os.makedirs(extract_dir)
            except OSError:
                pass
            local_tar_file = "%s.tar.gz" % date_string
            local_tar_file_path = os.path.join(self.output_files_location, watershed,
                                          local_tar_file)
            try: 
                #download file
                r = requests.get(resource_info['url'], stream=True)
                with open(local_tar_file_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=1024): 
                        if chunk: # filter out keep-alive new chunks
                            f.write(chunk)
                            f.flush()
                tar = tarfile.open(local_tar_file_path)
                tar.extractall(extract_dir)
                tar.close()
            except IOError:
                #remove directory
                try:
                    rmtree(extract_dir)
                except OSError:
                    pass                
                pass
            #clean up downloaded tar.gz file
            try:
                os.remove(local_tar_file_path)
            except OSError:
                pass
            
#-----------------------------------------------------------------------------
#Class RAPIDInputDatasetManager
#-----------------------------------------------------------------------------            
class RAPIDInputDatasetManager():
    """
    This class is used to find and download, zip and upload prediction files from/to a data server
    """
    def __init__(self, engine_url, api_key, model_name, input_files_location, app_instance_uuid):
        if engine_url.endswith('/'):
            engine_url = engine_url[:-1]
        if not engine_url.endswith('api/action') and not engine_url.endswith('api/3/action'):
            engine_url += '/api/action'
        self.dataset_engine = CkanDatasetEngine(endpoint=engine_url, apikey=api_key)
        self.model_name = model_name
        self.input_files_location = input_files_location
        self.app_instance_uuid = app_instance_uuid

    def zip_upload_resource(self, watershed):
        """
        This function adds RAPID files in to zip files and
        uploads files to data store
        """
        watershed_input_files_path = os.path.join(self.input_files_location, watershed)
        #get info for waterhseds
        basin_name_search = re.compile(r'rapid_namelist_(\w+).dat')
        basin_file = glob(os.path.join(watershed_input_files_path,'rapid_namelist_*.dat'))[0]
        basin_name = basin_name_search.search(basin_file).group(1)
        try:
            output_filename =  os.path.join(self.input_files_location, "%s-%s-rapid-input.zip" % (watershed, basin_name))
        except AttributeError:
            # basin name not found - do nothing
            pass
 
        #zip RAPID files
        print "Zipping files for watershed: %s" % watershed
        zip_file = zipfile.ZipFile(output_filename, 'w')
        for root, dirs, files in os.walk(watershed_input_files_path):
            for file in files:
                zip_file.write(os.path.join(root, file), os.path.join(watershed, file))
            
        zip_file.close()
        print "Finished zipping files"
        
        #upload dataset
        print "Uploading datasets"

        self.upload_resource(watershed, basin_name, output_filename)
        
        print "Finished uploading datasets"
    
    def get_dataset_id(self, watershed, subbasin):
        """
        This function gets the id of a dataset
        """
        find_dataset_dict = {
            'name': '%s-rapid-input-%s' % (self.model_name, self.app_instance_uuid),
        }
    
        # Use the json module to load CKAN's response into a dictionary.
        response_dict = self.dataset_engine.search_datasets(find_dataset_dict)
        
        if response_dict['success']:
            if int(response_dict['result']['count']) > 0:
                return response_dict['result']['results'][0]['id']
            return None
        else:
            return None

    def create_dataset(self, watershed, subbasin):
        """
        This function creates a dataset if it does not exist
        """
        dataset_id = self.get_dataset_id(watershed, subbasin)
        #check if dataset exists
        if not dataset_id:
            #if it does not exist, create the dataset
            result = self.dataset_engine.create_dataset(name='%s-rapid-input-%s' % (self.model_name,
                                                                                    self.app_instance_uuid),
                                          notes=('This dataset contians files for input %s ' % self.model_name) + \
                                                  'with RAPID', 
                                          version='1.0', 
                                          tethys_app='erfp_tool', 
                                          app_instance_uuid=self.app_instance_uuid,
                                          waterhsed=watershed,
                                          subbasin=subbasin)
            dataset_id = result['result']['id']
        return dataset_id
       
    def upload_resource(self, watershed, subbasin, file_to_upload):
        """
        This function uploads a resource to a dataset if it does not exist
        """
        #create dataset for each watershed-subbasin combo if needed
        dataset_id = self.create_dataset(watershed, subbasin)
        if dataset_id:
            #check if dataset already exists
            resource_name = '%s-rapid-input-%s-%s' % (self.model_name, watershed, subbasin)
                                               
            resource_results = self.dataset_engine.search_resources({'name':resource_name},
                                                                    datset_id=dataset_id)
            try:
                if resource_results['result']['count'] > 0:
                    """
                    CKAN API CURRENTLY DOES NOT WORK FOR UPDATE - bug = needs file or url, 
                    but requres both and to have only one ...

                    #update existing resource
                    print resource_results['result']['results'][0]
                    update_results = self.dataset_engine.update_resource(resource_results['result']['results'][0]['id'], 
                                                        file=file_to_upload,
                                                        url="",
                                                        date_uploaded=datetime.datetime.utcnow().strftime("%Y%m%d%H%M"))
                    print update_results
                    """
                    self.dataset_engine.delete_resource(resource_results['result']['results'][0]['id'])
                #upload resources to the dataset
                self.dataset_engine.create_resource(dataset_id, 
                                                name=resource_name, 
                                                file=file_to_upload,
                                                format="zip", 
                                                tethys_app="erfp_tool",
                                                watershed=watershed,
                                                subbasin=subbasin,
                                                date_uploaded=datetime.datetime.utcnow().strftime("%Y%m%d%H%M"),
                                                description="ECMWF-RAPID Input Files")

            except Exception,e:
                print e
                traceback.print_exc()
                pass
         
            
    def get_resource_info(self, watershed, subbasin):
        """
        This function gets the info of a resource
        """
        dataset_id = self.get_dataset_id(watershed, subbasin)
        if dataset_id:
            #check if dataset already exists
            resource_name = '%s-rapid-input-%s-%s' % (self.model_name, watershed, subbasin),
            resource_results = self.dataset_engine.search_resources({'name':resource_name},
                                                                    datset_id=dataset_id)
            try:
                if resource_results['result']['count'] > 0:
                    #upload resources to the dataset
                    return resource_results['result']['results'][0]
            except Exception,e:
                print e
                pass
        return None
    
    def download_resource(self, watershed, subbasin):
        resource_info = self.get_resource_info(watershed, subbasin)
        if resource_info and self.input_files_location and os.path.exists(self.input_files_location):
            extract_dir = os.path.join(self.input_files_location, watershed)
            #create directory
            try:
                os.makedirs(extract_dir)
            except OSError:
                pass
            local_zip_file = "%s.zip" % watershed
            local_zip_file_path = os.path.join(self.input_files_location, watershed,
                                          local_zip_file)
            try: 
                #download file
                r = requests.get(resource_info['url'], stream=True)
                with open(local_zip_file_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=1024): 
                        if chunk: # filter out keep-alive new chunks
                            f.write(chunk)
                            f.flush()
                zip_file = zipfile.open(local_zip_file_path)
                zip_file.extractall(extract_dir)
                zip_file.close()
            except IOError:
                #remove directory
                try:
                    rmtree(extract_dir)
                except OSError:
                    pass                
                pass
            #clean up downloaded zip file
            try:
                os.remove(local_zip_file_path)
            except OSError:
                pass
            
if __name__ == "__main__":
    engine_url = 'http://ciwckan.chpc.utah.edu'  
    api_key = '8dcc1b34-0e09-4ddc-8356-df4a24e5be87'
    model_name = 'ecmwf'
    input_files_location = '/home/alan/work/rapid/input'
    session = SettingsSessionMaker()
    main_settings  = session.query(MainSettings).order_by(MainSettings.id).first()
    app_instance_uuid = main_settings.app_instance_uuid
    session.close()
    rapid_dataset_manager = RAPIDInputDatasetManager(engine_url, 
                                                     api_key, 
                                                     model_name, 
                                                     input_files_location, 
                                                     app_instance_uuid)
    rapid_dataset_manager.zip_upload_resource('nicaragua')