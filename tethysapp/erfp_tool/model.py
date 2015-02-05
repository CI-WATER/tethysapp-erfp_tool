# Put your persistent store models in this file
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, sessionmaker

from .utilities import get_persistent_store_engine
# DB Engine, sessionmaker and base
settingsEngine = get_persistent_store_engine('settings_db')
SettingsSessionMaker = sessionmaker(bind=settingsEngine)
Base = declarative_base()

# SQLAlchemy ORM definition for the main_settings table
class MainSettings(Base):
    '''
    Main Settings DB Model
    '''
    __tablename__ = 'main_settings'

    # Columns
    id = Column(Integer, primary_key=True)
    base_layer_id = Column(Integer,ForeignKey('base_layer.id'))
    base_layer = relationship("BaseLayer")
    local_prediction_files = Column(String)
    morning_hour = Column(Integer)
    evening_hour = Column(Integer)

    def __init__(self, base_layer_id, local_prediction_files, morning_hour,
                 evening_hour):
        """
        Constructor for settings
        """
        self.base_layer_id = base_layer_id
        self.local_prediction_files = local_prediction_files
        self.morning_hour = morning_hour
        self.evening_hour = evening_hour
        
# SQLAlchemy ORM definition for the data_store_type table
class BaseLayer(Base):
    '''
    DataStore DB Model
    '''
    __tablename__ = 'base_layer'

    # Columns
    id = Column(Integer, primary_key=True)
    name = Column(String)
    api_key = Column(String)

    def __init__(self, name, api_key):
        """
        Constructor for settings
        """
        self.name = name
        self.api_key = api_key

# SQLAlchemy ORM definition for the data_store table
class DataStore(Base):
    '''
    DataStore DB Model
    '''
    __tablename__ = 'data_store'

    # Columns
    id = Column(Integer, primary_key=True)
    name = Column(String)
    data_store_type_id = Column(Integer,ForeignKey('data_store_type.id'))
    data_store_type = relationship("DataStoreType")
    api_endpoint = Column(String)
    api_key = Column(String)

    def __init__(self, server_name, data_store_type_id, api_endpoint, api_key):
        """
        Constructor for settings
        """
        self.name = server_name
        self.data_store_type_id = data_store_type_id
        self.api_endpoint = api_endpoint
        self.api_key = api_key

# SQLAlchemy ORM definition for the data_store_type table
class DataStoreType(Base):
    '''
    DataStore DB Model
    '''
    __tablename__ = 'data_store_type'

    # Columns
    id = Column(Integer, primary_key=True)
    code_name = Column(String)
    human_readable_name = Column(String)

    def __init__(self, code_name, human_readable_name):
        """
        Constructor for settings
        """
        self.code_name = code_name
        self.human_readable_name = human_readable_name

# SQLAlchemy ORM definition for the data_store table
class Geoserver(Base):
    '''
    DataStore DB Model
    '''
    __tablename__ = 'geoserver'

    # Columns
    id = Column(Integer, primary_key=True)
    name = Column(String)
    url = Column(String)

    def __init__(self, name, url):
        """
        Constructor for settings
        """
        self.name = name
        self.url = url

# SQLAlchemy ORM definition for the data_store table
class Watershed(Base):
    '''
    DataStore DB Model
    '''
    __tablename__ = 'watershed'

    # Columns
    id = Column(Integer, primary_key=True)
    watershed_name = Column(String)
    subbasin_name = Column(String)
    folder_name = Column(String)
    file_name = Column(String)
    data_store_id = Column(Integer,ForeignKey('data_store.id'))
    data_store = relationship("DataStore")
    geoserver_id = Column(Integer,ForeignKey('geoserver.id'))
    geoserver = relationship("Geoserver")
    geoserver_drainage_line_layer = Column(String)
    geoserver_catchment_layer = Column(String)
    watershed_groups = relationship("WatershedGroup", 
                              secondary='watershed_watershed_group_link')
                              
    def __init__(self, watershed_name, subbasin_name, folder_name, file_name,
                 data_store_id, geoserver_id, geoserver_drainage_line_layer, 
                 geoserver_catchment_layer):
        """
        Constructor for settings
        """
        self.watershed_name = watershed_name
        self.subbasin_name = subbasin_name
        self.folder_name = folder_name
        self.file_name = file_name
        self.data_store_id = data_store_id
        self.geoserver_id = geoserver_id
        self.geoserver_drainage_line_layer = geoserver_drainage_line_layer
        self.geoserver_catchment_layer = geoserver_catchment_layer

class WatershedWatershedGroupLink(Base):
    __tablename__ = 'watershed_watershed_group_link'
    watershed_group_id = Column(Integer, ForeignKey('watershed_group.id'), primary_key=True)
    watershed_id = Column(Integer, ForeignKey('watershed.id'), primary_key=True)

class WatershedGroup(Base):
    '''
    DataStore DB Model
    '''
    __tablename__ = 'watershed_group'

    # Columns
    id = Column(Integer, primary_key=True)
    name = Column(String)
    watersheds = relationship("Watershed", 
                              secondary='watershed_watershed_group_link')

    def __init__(self, name):
        """
        Constructor for settings
        """
        self.name = name