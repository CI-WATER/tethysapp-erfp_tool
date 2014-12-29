# Put your persistent store models in this file
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import sessionmaker

from .utilities import get_persistent_store_engine

# DB Engine, sessionmaker and base
settings_engine = get_persistent_store_engine('settings_db')
SettingsSessionMaker = sessionmaker(bind=settings_engine)
Base = declarative_base()

# SQLAlchemy ORM definition for the main_settings table
class MainSettings (Base):
    '''
    Main Settings DB Model
    '''
    __tablename__ = 'main_settings'

    # Columns
    settings_id = Column(Integer, primary_key=True)
    base_layer = Column(String)
    api_key = Column(String)
    local_prediction_files = Column(String)

    def __init__(self, base_layer, api_key, local_prediction_files):
        """
        Constructor for settings
        """
        self.base_layer = base_layer
        self.api_key = api_key
        self.local_prediction_files = local_prediction_files
        
# SQLAlchemy ORM definition for the main_settings table
class DataStore (Base):
    '''
    DataStore DB Model
    '''
    __tablename__ = 'data_store'

    # Columns
    data_store_id = Column(Integer, primary_key=True)
    server_name = Column(String)
    server_type = Column(Integer)
    local_prediction_files = Column(String)

    def __init__(self, base_layer, api_key, local_prediction_files):
        """
        Constructor for settings
        """
        self.base_layer = base_layer
        self.api_key = api_key
        self.local_prediction_files = local_prediction_files