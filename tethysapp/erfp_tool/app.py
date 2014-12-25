from tethys_apps.base import DatasetService, TethysAppBase, url_map_maker


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
                    UrlMap(name='settings',
                           url='erfp-tool/settings',
                           controller='erfp_tool.controllers.settings'),
                    UrlMap(name='add_watershed',
                           url='erfp-tool/add-watershed',
                           controller='erfp_tool.controllers.add_watershed'),
                    UrlMap(name='get_reach_statistical_hydrograph',
                           url='erfp-tool/get-hydrograph',
                           controller='erfp_tool.controllers.get_hydrograph'),
        )

        return url_maps

    def dataset_services(self):
        """
        Add one or more dataset services
        """
        dataset_services = (DatasetService(name='ciwweb',
                                           type='ckan',
                                           endpoint='http://ciwweb.chpc.utah.edu/api/3/action',
                                           apikey='8dcc1b34-0e09-4ddc-8356-df4a24e5be87'
                                           ),
        )

        return dataset_services
