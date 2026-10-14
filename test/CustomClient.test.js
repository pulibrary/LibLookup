import { expect, jest, test } from '@jest/globals';
import { CustomClient } from '../CustomClient.js';

describe('Custom Client', () => {
  const connectURL = "https://hastings.net/"
  const jsonURL = connectURL + "catalog.json?q="
  const catalogURL = connectURL + "catalog?q="
  const result_count = 1
  const title = "The Library Catalog Interfaces 'They' Don't Want You to Know About"
  const subject = "REST APIs -- Conspiracy Theories"
  const inputQuery = `subject = "${subject}"`
  const outputQuery = encodeURIComponent(`mainSubject="${subject}"`)
  const linkQuery = `link = "${jsonURL + outputQuery}"`
  const config = { 
    "connectUrl": connectURL,
    "resultCountBaseUrl": jsonURL,
    "recordsBaseUrl": "https://hastings.net/catalog.json?q=",   
    "relators": {'default':'='},
    "indexes": [{"code":"subject","paramName":"mainSubject"}],
    "recIdField": "id",
    "pageParam": "page",
    "maxRecsParam": "results_per_page",    
  }
  const configJSON = { ...config, 
    "resultFormat": "json", 
    "recordsField": "$.records",
    "catalogLinkUrl": catalogURL,
    "resultCountField": "json:$.result_count"
  }
  const configXML = { ...config, 
    "wrappers":["json:$.xmlRecord"], 
    "recordsField": "$.records",
    "resultFormat": "xml",    
    "resultCountField": "json:$.result_count"
  }
  const configXMLNS = { ...config,
    "resultFormat": "xml", 
    "namespaces": {
      "marc": "http://www.loc.gov/MARC21/slim"
    } 
  }
  const mockDataJSON = { 
    result_count: result_count,
    records: {title: title}
  }
  const xml = `<title>${title}</title><subject>${subject}</subject>`
  const xmlRecord = `<record>${xml}</record>`
  const xmlRecordNS = `<record xmlns="http://www.loc.gov/MARC21/slim">${xml}</record>`
  const mockDataXML = { 
    result_count: result_count,
    records: [{xmlRecord: xmlRecord}]
  }
  const mockDataEmpty = {
    result_count: 0,
    records: ""
  }
  var fetchSpy
  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  test('JSON response', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockDataJSON)      
    });
    const client = new CustomClient(configJSON)
    expect(client.config.connectUrl).toBe(connectURL)
    expect(await client.connect()).toBe(true)

    const queryResponse = await client.query(inputQuery)
    expect(queryResponse.numberOfRecords).toBe(result_count)
    expect(queryResponse.records[0].title).toBe(title)
    expect(client.getCatalogLink()).toBe(catalogURL + outputQuery)
  });

  test('XML wrapped in JSON', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockDataXML)    
    });
    const client = new CustomClient(configXML)
    expect(client.config.connectUrl).toBe(connectURL)
    expect(await client.connect()).toBe(true)

    const queryResponse = await client.query(inputQuery)
    expect(queryResponse.numberOfRecords).toBe(result_count)
    expect(queryResponse.records[0]).toBe(xmlRecord)

    
  })

  test('XML with namespaces', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => xmlRecordNS
    })    

    const clientNS = new CustomClient(configXMLNS)
    const queryResponseNS = await clientNS.query(inputQuery,1,50,false)
    expect(queryResponseNS.records[0]).toBe(xmlRecordNS)
  })

  test('failed query', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => JSON.stringify(mockDataEmpty)
    });
    const client = new CustomClient(configJSON)
    expect(await client.connect()).toBe(false)

    const queryResponse = await client.query(inputQuery)
    expect(queryResponse.numberOfRecords).toBe(0)
  })

  test('zero result query', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockDataEmpty)
    });
    const client = new CustomClient(configJSON)
    expect(await client.connect()).toBe(true)

    const queryResponse = await client.query(inputQuery)
    expect(queryResponse.numberOfRecords).toBe(0)
  })

  test('link query', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(mockDataJSON)
    });
    const client = new CustomClient(configJSON)
    expect(client.config.connectUrl).toBe(connectURL)
    expect(await client.connect()).toBe(true)

    const linkQueryResponse = await client.query(linkQuery)
    expect(linkQueryResponse.numberOfRecords).toBe(result_count)
    expect(client.getCatalogLink()).toBe(catalogURL + outputQuery)
  });
  
});
