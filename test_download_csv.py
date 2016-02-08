import unittest
import urllib
import urllib2

HOST = "http://aide.apps.eea.europa.eu"
DOWNLOAD_URL = HOST + "/download"

ARGS_RQST = {
    'download_query': '%s/?source=' \
                      '{"query":{"bool":{"must":[{"term":{"Pollutant":"As"}}]}}' \
                      ',"sort":[{"Namespace":{"order":"asc"}},{"ReportingYear":{"order":"asc"}}]}' \
                      % HOST,
    'download_format': 'csv'
}

CORRECT_CSV = u'id,Country,Namespace,Reporting year,Network,Network name,' \
              u'Measurement station,Station EoI code,Measurement station name,' \
              u'Sampling point,Used for AQD,Data aggregation process,' \
              u'Data reporting metric,Objective type,Protection target,' \
              u'Air pollutant,Air pollution level,Exceedance threshold,Unit,' \
              u'Data coverage [%],Data verification,Type of station,' \
              u'Area of station,Latitude of station,Longitude of station,' \
              u'Zone code,Zone description,Type of zone\n' \
              u'2013#Latvia.As.P1Y-WA-avg.MO.SPO-LV00010_02018_100,Latvia,' \
              u'LV.LEGMC.AQ,2013,NET-LV001A,"""Regional GAW/EMEP Monitoring Network""",' \
              u'STA-LV00010,LV00010,"""Rucava""",SPO-LV00010_02018_100,NO,' \
              u'yearly mean weighted average,Annual mean / average,Monitoring objective (MO)' \
              u'Not applicable,As,0.38,,ug.l-1,80.55,Verified,Background,Rural-Regional,' \
              u'56.16235,21.173331,,,\n' \
              u'2014#Latvia.As.P1Y-WA-avg.MO.SPO-LV00010_02018_100,Latvia,' \
              u'LV.LEGMC.AQ,2014,NET-LV001A,"""Regional GAW/EMEP Monitoring Network""",' \
              u'STA-LV00010,LV00010,"""Rucava""",SPO-LV00010_02018_100,NO,' \
              u'yearly mean weighted average,Annual mean / average,Monitoring objective (MO),' \
              u'Not applicable,As,0.35,,ug.l-1,79.45,Verified,Background,Rural-Regional,56.16235,21.173331,,,\n'

class DownloadCSVTest(unittest.TestCase):
    
    def test(self):
        test_url = "%s?%s" % (DOWNLOAD_URL, urllib.urlencode(ARGS_RQST))
        res = urllib2.urlopen(test_url, timeout=2)
        csv = res.read()
        self.assertEqual(csv.decode('utf-8-sig'), CORRECT_CSV)
        

if __name__ == '__main__':
    unittest.main()
