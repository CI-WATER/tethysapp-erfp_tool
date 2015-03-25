tethysapp-erfp_tool
===================

#ECMWF-RAPID Flood Prediction Tool App

**This app is created to run in the Teyths programming environment.
See: https://github.com/CI-WATER/tethys and http://tethys-platform.readthedocs.org/en/1.0.0/**

*This app requires you to have the ECMWF-RAPID preprocessing completed 
separately.*

##Prerequisites:
- Tethys Platform (CKAN, PostgesQL, GeoServer)
- netCDF4-python (python package)

###Install netCDF4-python on Ubuntu:
In the terminal:
```
$ apt-get install python-dev zlib1g-dev libhdf5-serial-dev libnetcdf-dev 
$ pip install numpy
$ pip install netCDF4
```
###Install netCDF4-python on Redhat:
*Note: this app was desgined and tested in Ubuntu*

In the terminal:
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
git clone https://github.com/CI-WATER/tethysapp-erfp_tool.git
```
Then install the app in Tethys Platform:
```
. /usr/lib/tethys/bin/activate
cd tethysapp-erfp_tool
python setup.py install
tethys syncstores erfp_tool
python /usr/lib/tethys/src/manage.py collectstatic
```
Restart the Apache Server:
See: http://docs.tethys.ci-water.org/en/latest/production.html#enable-site-and-restart-apache
