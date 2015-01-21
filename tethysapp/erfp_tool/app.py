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
                    UrlMap(name='map',
                           url='erfp-tool/map',
                           controller='erfp_tool.controllers.map'),
                    UrlMap(name='get_reach_statistical_hydrograph_ajax',
                           url='erfp-tool/map/get-hydrograph',
                           controller='erfp_tool.controllers_ajax.get_hydrograph'),
                    UrlMap(name='get_avaialable_dates_ajax',
                           url='erfp-tool/map/get-avaialable-dates',
                           controller='erfp_tool.controllers_ajax.get_avaialable_dates'),
                    UrlMap(name='settings',
                           url='erfp-tool/settings',
                           controller='erfp_tool.controllers.settings'),
                    UrlMap(name='update_settings_ajax',
                           url='erfp-tool/settings/update',
                           controller='erfp_tool.controllers_ajax.settings_update'),
                    UrlMap(name='add-watershed',
                           url='erfp-tool/add-watershed',
                           controller='erfp_tool.controllers.add_watershed'),
                    UrlMap(name='add-watershed-ajax',
                           url='erfp-tool/add-watershed/submit',
                           controller='erfp_tool.controllers_ajax.watershed_add'),
                    UrlMap(name='manage-watersheds',
                           url='erfp-tool/manage-watersheds',
                           controller='erfp_tool.controllers.manage_watersheds'),
                    UrlMap(name='delete-watershed',
                           url='erfp-tool/manage-watersheds/delete',
                           controller='erfp_tool.controllers_ajax.watershed_delete'),
                    UrlMap(name='update-watershed',
                           url='erfp-tool/manage-watersheds/submit',
                           controller='erfp_tool.controllers_ajax.watershed_update'),
                    UrlMap(name='add-geoserver',
                           url='erfp-tool/add-geoserver',
                           controller='erfp_tool.controllers.add_geoserver'),
                    UrlMap(name='add-geoserver-ajax',
                           url='erfp-tool/add-geoserver/submit',
                           controller='erfp_tool.controllers_ajax.geoserver_add'),
                    UrlMap(name='manage-geoservers',
                           url='erfp-tool/manage-geoservers',
                           controller='erfp_tool.controllers.manage_geoservers'),
                    UrlMap(name='update-geoservers-ajax',
                           url='erfp-tool/manage-geoservers/submit',
                           controller='erfp_tool.controllers_ajax.geoserver_update'),
                    UrlMap(name='delete-geoserver-ajax',
                           url='erfp-tool/manage-geoservers/delete',
                           controller='erfp_tool.controllers_ajax.geoserver_delete'),
                    UrlMap(name='add-data-store',
                           url='erfp-tool/add-data-store',
                           controller='erfp_tool.controllers.add_data_store'),
                    UrlMap(name='add-data-store-ajax',
                           url='erfp-tool/add-data-store/submit',
                           controller='erfp_tool.controllers_ajax.data_store_add'),
                    UrlMap(name='manage-data-stores',
                           url='erfp-tool/manage-data-stores',
                           controller='erfp_tool.controllers.manage_data_stores'),
                    UrlMap(name='update-data-store-ajax',
                           url='erfp-tool/manage-data-stores/submit',
                           controller='erfp_tool.controllers_ajax.data_store_update'),
                    UrlMap(name='delete-data-store-ajax',
                           url='erfp-tool/manage-data-stores/delete',
                           controller='erfp_tool.controllers_ajax.data_store_delete'),
                    UrlMap(name='add-watershed-group',
                           url='erfp-tool/add-watershed-group',
                           controller='erfp_tool.controllers.add_watershed_group'),
                    UrlMap(name='add-watershed-group-ajax',
                           url='erfp-tool/add-watershed-group/submit',
                           controller='erfp_tool.controllers_ajax.watershed_group_add'),
                    UrlMap(name='manage-watershed-groups',
                           url='erfp-tool/manage-watershed-groups',
                           controller='erfp_tool.controllers.manage_watershed_groups'),
                    UrlMap(name='update-watershed-group-ajax',
                           url='erfp-tool/manage-watershed-groups/submit',
                           controller='erfp_tool.controllers_ajax.watershed_group_update'),
                    UrlMap(name='delete-watershed-group-ajax',
                           url='erfp-tool/manage-watershed-groups/delete',
                           controller='erfp_tool.controllers_ajax.watershed_group_delete'),
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