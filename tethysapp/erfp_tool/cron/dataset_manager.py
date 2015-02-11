#!/usr/bin/env python
import datetime
from glob import glob
import os
import re
import requests
from shutil import rmtree
import tarfile
from tethys_dataset_services.engines import CkanDatasetEngine

class ERFPDatasetManager():
    """
    This class is used to find, zip and upload files to a data server
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
        basin_name_search = re.compile('Qout_(.+?)_[a-zA-Z\d]+.nc')
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