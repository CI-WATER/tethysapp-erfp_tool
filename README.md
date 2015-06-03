#Streamflow Prediction Tool App
*tethysapp-erfp_tool*

**This app is created to run in the Teyths programming environment.
See: https://github.com/CI-WATER/tethys and http://tethys-platform.readthedocs.org/en/1.0.0/**

*This app requires you to have the ECMWF-RAPID preprocessing completed 
separately. See: https://github.com/CI-WATER/erfp_data_process_ubuntu or https://github.com/CI-WATER/erfp_data_process_ubuntu_aws*

##Prerequisites:
- Tethys Platform (CKAN, PostgresQL, GeoServer)
- netCDF4-python (Python package)

###Install netCDF4-python on Ubuntu:
```
$ apt-get install python-dev zlib1g-dev libhdf5-serial-dev libnetcdf-dev 
$ pip install numpy
$ pip install netCDF4
```
###Install netCDF4-python on Redhat:
*Note: this app was desgined and tested in Ubuntu*
```
$ yum install netcdf4-python
$ yum install hdf5-devel
$ yum install netcdf-devel
$ pip install numpy
$ pip install netCDF4
```
##Installation:
Clone the app into the directory you want:
```
$ git clone https://github.com/CI-WATER/tethysapp-erfp_tool.git
$ cd tethysapp-erfp_tool
$ gii submodule init
$ git submodule update
```
Then install the app in Tethys Platform:
```
$ . /usr/lib/tethys/bin/activate
$ cd tethysapp-erfp_tool
$ python setup.py install
$ tethys syncstores erfp_tool
$ python /usr/lib/tethys/src/manage.py collectstatic
```
Restart the Apache Server:
See: http://tethys-platform.readthedocs.org/en/1.0.0/production.html#enable-site-and-restart-apache

##Updating the App:
Update the local repository and Tethys Platform instance.
```
$ cd tethysapp-erfp_tool
$ gii pull
$ git submodule update
$ tethys syncstores erfp_tool
$ python /usr/lib/tethys/src/manage.py collectstatic
```
Restart the Apache Server:
See: http://tethys-platform.readthedocs.org/en/1.0.0/production.html#enable-site-and-restart-apache

