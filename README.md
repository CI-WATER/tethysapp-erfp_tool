tethysapp-erfp_tool
===================

ECMWF-RAPID Flood Prediction Tool App

This app is created to run in the Teyths programming environment.
See: https://github.com/CI-WATER/tethys

It requires you to have the ECMWF-RAPID preprocessing completed 
separately. Additionally, it can only run if you give access to the app.

Prerequisites:
netCDF4 (python package)

Install on Redhat:
yum install netcdf4-python
yum install hdf5-devel
yum install netcdf-devel
pip install netCDF4

Install on Ubuntu:
apt-get install libhdf5-serial-dev
apt-get install zlib1g-dev
apt-get install libnetcdf-dev
apt-get install python-dev
pip install netCDF4
