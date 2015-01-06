from tethys_apps.base import TethysAppBase, url_map_maker
from tethys_apps.base import PersistentStore

class ECMWFRAPIDFloodPredictionTool(TethysAppBase):
    """
    Tethys app class for ECMWF-RAPID Flood Prediction Tool.
    """

    name = 'ECMWF-RAPID Flood Prediction Tool'
    index = 'erfp_tool:home'
    icon = 'erfp_tool/images/icon.gif'
    package = 'erfp_tool'
    root_url = 'erfp-tool'
    color = '#34495e'
        
    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (UrlMap(name='home',
                           url='erfp-tool',
                           controller='erfp_tool.controllers.home'),
                    UrlMap(name='get_reach_statistical_hydrograph_ajax',
                           url='erfp-tool/get-hydrograph',
                           controller='erfp_tool.controllers.get_hydrograph_ajax'),
                    UrlMap(name='get_avaialable_dates_ajax',
                           url='erfp-tool/get-avaialable-dates',
                           controller='erfp_tool.controllers.get_avaialable_dates_ajax'),
                    UrlMap(name='settings',
                           url='erfp-tool/settings',
                           controller='erfp_tool.controllers.settings'),
                    UrlMap(name='update_settings_ajax',
                           url='erfp-tool/settings/update',
                           controller='erfp_tool.controllers.update_settings_ajax'),
                    UrlMap(name='add-watershed',
                           url='erfp-tool/add-watershed',
                           controller='erfp_tool.controllers.add_watershed'),
                    UrlMap(name='add-watershed-ajax',
                           url='erfp-tool/add-watershed/submit',
                           controller='erfp_tool.controllers.add_watershed_ajax'),
                    UrlMap(name='manage-watersheds',
                           url='erfp-tool/manage-watersheds',
                           controller='erfp_tool.controllers.manage_watersheds'),
                    UrlMap(name='delete-watershed',
                           url='erfp-tool/manage-watersheds/delete',
                           controller='erfp_tool.controllers.delete_watershed_ajax'),
                    UrlMap(name='update-watershed',
                           url='erfp-tool/manage-watersheds/submit',
                           controller='erfp_tool.controllers.update_watershed_ajax'),
                    UrlMap(name='add-geoserver',
                           url='erfp-tool/add-geoserver',
                           controller='erfp_tool.controllers.add_geoserver'),
                    UrlMap(name='add-geoserver-ajax',
                           url='erfp-tool/add-geoserver/submit',
                           controller='erfp_tool.controllers.add_geoserver_ajax'),
                    UrlMap(name='manage-geoservers',
                           url='erfp-tool/manage-geoservers',
                           controller='erfp_tool.controllers.manage_geoservers'),
                    UrlMap(name='update-geoservers-ajax',
                           url='erfp-tool/manage-geoservers/submit',
                           controller='erfp_tool.controllers.update_geoserver_ajax'),
                    UrlMap(name='delete-geoserver-ajax',
                           url='erfp-tool/manage-geoservers/delete',
                           controller='erfp_tool.controllers.delete_geoserver_ajax'),
                    UrlMap(name='add-data-store',
                           url='erfp-tool/add-data-store',
                           controller='erfp_tool.controllers.add_data_store'),
                    UrlMap(name='add-data-store-ajax',
                           url='erfp-tool/add-data-store/submit',
                           controller='erfp_tool.controllers.add_data_store_ajax'),
                    UrlMap(name='manage-data-stores',
                           url='erfp-tool/manage-data-stores',
                           controller='erfp_tool.controllers.manage_data_stores'),
                    UrlMap(name='update-data-store-ajax',
                           url='erfp-tool/manage-data-stores/submit',
                           controller='erfp_tool.controllers.update_data_store_ajax'),
                    UrlMap(name='delete-data-store-ajax',
                           url='erfp-tool/manage-data-stores/delete',
                           controller='erfp_tool.controllers.delete_data_store_ajax'),
        )
        return url_maps
        
    def persistent_stores(self):
        """
        Add one or more persistent stores
        """
        stores = (PersistentStore(name='settings_db',
                                  initializer='init_stores:init_erfp_settings_db',
                                  spatial=False
                ),
        )

        return stores