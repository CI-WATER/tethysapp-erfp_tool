# Put your persistent store initializer functions in here
from .model import settings_engine, SettingsSessionMaker, Base, MainSettings

def init_main_settings_db(first_time):
    # Create tables
    Base.metadata.create_all(settings_engine)