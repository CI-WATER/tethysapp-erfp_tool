"""
********************************************************************************
* Project: tethysapp-erfp_tool
* Name: export_data
* Author: Scott Christensen
* Created On: 18 August 2015
* Copyright: (c) Brigham Young University 2015
* License: BSD 2-Clause
********************************************************************************
"""

import netCDF4 as nc
import numpy as np
import os


def export_data_to_csv(comid,
                       wrf_hydro_files_location,
                       ecmwf_files_location,
                       watershed,
                       subbasin,
                       file_obj,
                       no_data_value=-9999):

    #get forecast files
    files = []
    files.extend(_get_file_list(wrf_hydro_files_location))
    files.extend(_get_file_list(os.path.join(ecmwf_files_location, watershed, subbasin)))

    #get timeseries data
    all_timeseries = []
    for file_name in sorted(files):
        timeseries = _get_timeseries_data(file_name, comid)
        if timeseries:
            all_timeseries.append(timeseries)

    headers = [triplet[2] for triplet in all_timeseries]

    #combine times
    all_times = [triplet[0] for triplet in all_timeseries]
    combined_times = _get_combined_times(all_times)

    #combine all timeseries into a matrix
    data = _get_combined_data(combined_times, all_timeseries, no_data_value)

    #write to CSV file
    _write_to_csv(data, headers, no_data_value, file_obj=file_obj)


def _get_file_list(root_dir):
    file_list = []
    for dir, subdirs, files in os.walk(root_dir):
        for file_name in files:
            if file_name.endswith('.nc'):
                file_list.append(os.path.join(dir, file_name))
    return file_list


def _get_timeseries_data(file_name, comid):
    data = nc.Dataset(file_name, 'r')

    index = _get_index(data.variables['COMID'][:], comid)
    try:
        values = data.variables['Qout'][index,:]
        times = data.variables['time'][:]
        header = _get_header(file_name)
        return (times, values, header)
    except IndexError:
        print('COMID %s not found. Skipping file %s.' % (comid, file_name))
    except Exception, e:
        print('ERROR: %s. Skipping file %s.' % (e, file_name))


def _get_header(file_name):
    basename = os.path.basename(file_name)
    dirname = os.path.dirname(file_name)
    if basename.startswith('Qout'):
        date = os.path.basename(dirname)
        ensemble = basename.split('.')[0].split('_')[-1]
        header = 'ECMWF_%s_%s' % (date, ensemble)
    else:
        date = basename.split('_')[1]
        header = 'WRF-Hydro_%s' % (date,)

    return header


def _get_combined_times(all_times):
    original_times = np.unique(np.concatenate(all_times))
    time_steps = []
    for i in range(1, len(original_times)):
        time_steps.append(original_times[i] - original_times[i - 1])

    time_step = min(time_steps)
    start_time = min(original_times)
    end_time = max(original_times) + time_step

    times = np.array(range(start_time, end_time, time_step))
    return times


def _get_combined_data(combined_times, all_timeseries, no_data_value):
    data_series = [combined_times]
    for times, values, header in all_timeseries:
        expanded_values = [no_data_value]*len(combined_times)
        for time, value in zip(times, values):
            index = _get_index(combined_times, time)
            try:
                expanded_values[index] = value
            except:
                raise IndexError('There is a problem with the time series format. The time %s was not found.' % time)
        data_series.append(expanded_values)

    return np.transpose(data_series)


def _write_to_csv(data, headers, no_data_value, file_obj):
    headers.insert(0,'time')
    header_str = ','.join(headers)
    #np.savetxt(file_name, data, delimiter=',', fmt='%10.5f', header=header_str)
    csv = file_obj
    csv.write(header_str + '\n')
    for i in range(len(data)):
        row = data[i]
        csv.write('%d,' % row[0])
        for j in range(1,len(row)):
            if row[j] != no_data_value:
                csv.write(str(row[j]))
            csv.write(',')
        csv.write('\n')


def _get_index(array, value):
    try:
        index = np.where(array == value)[0][0]
        return index
    except IndexError, e:
        pass

if __name__ == '__main__':
    root_dir = '/var/www/tethys/apps/tethysapp-erfp_tool'
    wrf_hydro_files_location = os.path.join(root_dir, 'wrf_hydro_rapid_output')
    ecmwf_files_location = os.path.join(root_dir, 'ecmwf_rapid_output')
    watershed = 'nfie_great_basin_region'
    subbasin = 'huc_2_16'
    comid = 946060409
    csv_file_name = 'erfp_exported_data.csv'
    export_data_to_csv(comid, wrf_hydro_files_location, ecmwf_files_location, watershed, subbasin, csv_file_name)