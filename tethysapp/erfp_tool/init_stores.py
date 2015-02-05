# Put your persistent store initializer functions in here
from .model import (Base, BaseLayer, DataStore, DataStoreType, Geoserver, MainSettings,
                    settingsEngine, SettingsSessionMaker)

def init_erfp_settings_db(first_time):
    # Create tables
    Base.metadata.create_all(settingsEngine)
    
    # Initial data
    if first_time:
        #make session
        session = SettingsSessionMaker()
        
        #add all possible base layers
        session.add(BaseLayer("MapQuest","none",))
        session.add(BaseLayer("BingMaps","",))
        session.add(BaseLayer("OSM","none",))
        
        #add all possible data story types
        session.add(DataStoreType("local", "Local Server"))
        session.add(DataStoreType("ckan", "CKAN"))
        session.add(DataStoreType("hydroshare", "HydroShare"))
        
        #add all possible data stores
        session.add(DataStore("Local Server", 1, "local", ""))

        #add all possible geoservers
        session.add(Geoserver("Local Server", "media"))

        #add main settings
        session.add(MainSettings(1, "", 3, 15))
        
        session.commit()