#Streamflow Prediction Tool App
*tethysapp-erfp_tool*

**This app is created to run in the Teyths programming environment with GeoServer and CKAN.
See: https://github.com/CI-WATER/tethys and http://docs.tethys.ci-water.org**

*This app requires you to have the ECMWF-RAPID preprocessing completed 
separately. See: https://github.com/CI-WATER/erfp_data_process_ubuntu_aws*

##Prerequisites:
- Tethys Platform (CKAN, PostgresQL, GeoServer)
- netCDF4-python (Python package)

###Install netCDF4-python on Ubuntu:
```
$ sudo apt-get install python-dev zlib1g-dev libhdf5-serial-dev libnetcdf-dev
$ sudo su
$ . /usr/lib/tethys/bin/activate
$ pip install numpy
$ pip install netCDF4
$ exit
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
$ git submodule init
$ git submodule update
```
Then install the app in Tethys Platform.

###Installation for App Development:
```
$ . /usr/lib/tethys/bin/activate
$ cd tethysapp-erfp_tool
$ python setup.py develop
$ tethys syncstores erfp_tool
```
###Installation for Production:
```
$ . /usr/lib/tethys/bin/activate
$ cd tethysapp-erfp_tool
$ python setup.py install
$ tethys syncstores erfp_tool
$ tethys manage collectstatic
```
Restart the Apache Server:
See: http://tethys-platform.readthedocs.org/en/1.0.0/production.html#enable-site-and-restart-apache

##Updating the App:
Update the local repository and Tethys Platform instance.
```
$ . /usr/lib/tethys/bin/activate
$ cd tethysapp-erfp_tool
$ git pull
$ git submodule update
```
Reset the database if changes are made to the database (this will delete your old database and regenerate a new app instance id):
```
$ tethys syncstores erfp_tool -r
```
Restart the Apache Server:
See: http://tethys-platform.readthedocs.org/en/1.0.0/production.html#enable-site-and-restart-apache

#Troubleshooting
If you see this error:
ImportError: No module named packages.urllib3.poolmanager
```
$ pip install pip --upgrade
```
Restart your terminal
```
$ pip install requests --upgrade
```
