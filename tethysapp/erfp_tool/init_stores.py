# Put your persistent store initializer functions in here
from .model import (Base, BaseLayer, DataStoreType, MainSettings,
                    settingsEngine, SettingsSessionMaker)

def init_erfp_settings_db(first_time):
    # Create tables
    Base.metadata.create_all(settingsEngine)
    
    # Initial data
    if first_time:
        #make session
        session = SettingsSessionMaker()
        
        #add all possible base layers
        session.add(BaseLayer("BingMaps","",))
        session.add(BaseLayer("OSM","",))
        session.add(BaseLayer("MapQuest","",))
        
        #add all possible data story types
        session.add(DataStoreType("ckan", "CKAN"))
        session.add(DataStoreType("hydroshare", "HydroShare"))
        
        #add main settings
        session.add(MainSettings(1, ""))
        
        session.commit()