import { expect, jest, test } from '@jest/globals';
import { SRUClient } from '../SRUClient.js';

describe('Alma SRU Client', () => {
  const baseurl = "https://federation.alma.exlibrisgroup.com/view/sru/87STAR_SHIP"
  const config = {
    baseurl: baseurl
  }
  const smallRecordCount = 178
  const mediumRecordCount = 7500
  const largeRecordCount = 15000
  const hugeRecordCount = 30000
  const barcode_a = "NCC-1701"
  const barcode_b = "NCC-74656"
  const mockExplain = "<explainResponse></explainResponse>"
  const mockMARC = `<searchRetrieveResponse xmlns="http://www.loc.gov/zing/srw/">
    <version>1.2</version><numberOfRecords>[[recordCount]]</numberOfRecords>
    <records><record><recordSchema>marcxml</recordSchema><recordPacking>xml</recordPacking>
    <recordData><record xmlns="http://www.loc.gov/MARC21/slim"><datafield ind1=" " ind2=" " tag="245">
    <subfield code="a">100 Greatest Holonovels</subfield><subfield code="t"/></datafield>
    </record></recordData></record></records></searchRetrieveResponse>`
  const mockMARCTransformed = `<record xmlns="http://www.loc.gov/MARC21/slim"><datafield tag="245" ind1=" " ind2=" ">
    <subfield code="a">100 Greatest Holonovels</subfield><subfield code="t"></subfield></datafield>
    </record>`
  const mockIsoHoldings = `<searchRetrieveResponse xmlns="http://www.loc.gov/zing/srw/">
    <version>1.2</version><numberOfRecords>[[recordCount]]</numberOfRecords>
    <records><record><recordSchema>isohold</recordSchema><recordPacking>xml</recordPacking>
    <recordData><holdings xmlns="http://www.loc.gov/standards/iso20775/">
    <holding><copyInformation><pieceIdentifier><value>${barcode_a}</value></pieceIdentifier></copyInformation></holding>
    <holding><component><pieceIdentifier><value>${barcode_b}</value></pieceIdentifier></component></holding>
    <holding></holding>
    </holdings></recordData></record></records></searchRetrieveResponse>`
  const mockResponseZero = mockMARC.replace(/<numberOfRecords>[^>]*>/,"")
  const mockResponseSmall = mockMARC.replace("[[recordCount]]",smallRecordCount)
  const mockResponseMedium = mockMARC.replace("[[recordCount]]",mediumRecordCount)
  const mockResponseLarge = mockMARC.replace("[[recordCount]]",largeRecordCount)
  const mockResponseHuge = mockMARC.replace("[[recordCount]]",hugeRecordCount)
  const mockResponseHoldings = mockIsoHoldings.replace("[[recordCount]]",smallRecordCount)
  const query = 'alma.starDate > 41153'
  const queryBarcode = query + ' AND alma.barcode = NCC-1701'
  const queryBarcodeEmpty = query + ' AND alma.barcode = [empty]'

  var fetchSpy
  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  test('failed connection', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      text: async() => ""
    });
    const client = new SRUClient(config)
    expect(client.config.baseurl).toBe(baseurl)
    expect(await client.connect()).toBe(false)
  });  

  test('basic query without holdings', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async() => mockExplain
    }).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async() => mockResponseSmall
    }).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async() => mockResponseSmall
    }).mockResolvedValue({
      ok: true,
      status: 200,
      text: async() => mockResponseZero
    });;

    const client = new SRUClient(config)
    expect(client.config.baseurl).toBe(baseurl)
    expect(await client.connect()).toBe(true)
    const queryResponse = await client.query(query)
    expect(parseInt(queryResponse.numberOfRecords)).toBe(smallRecordCount)
    expect(queryResponse.records[0]).toBe(mockMARCTransformed)
    console.log(queryResponse)
    const queryResponseZero = await client.query("")
    expect(queryResponseZero.numberOfRecords).toBe(0)
  })


  test('basic query with holdings', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async() => mockExplain
    }).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async() => mockResponseSmall
    }).mockResolvedValue({
      ok: true,
      status: 200,
      text: async() => mockResponseHoldings
    })

    const client = new SRUClient(config)
    expect(client.config.baseurl).toBe(baseurl)
    expect(await client.connect()).toBe(true)

    const queryResponse = await client.query(query,1,50,true)
    const queryResponse2 = await client.query(query,51,50,true)
    expect(parseInt(queryResponse.numberOfRecords)).toBe(smallRecordCount)
    expect(parseInt(queryResponse2.numberOfRecords)).toBe(smallRecordCount)

    const queryBarcodeResponse = await client.query(queryBarcode,1,50,true)
    expect(parseInt(queryBarcodeResponse.numberOfRecords)).toBe(smallRecordCount)
    expect(SRUClient.extractIsoHoldFields(queryBarcodeResponse.holdings[0][0],
      "//isohold:pieceIdentifier/isohold:value")).toEqual([barcode_a])
    expect(SRUClient.extractIsoHoldFields("","//isohold:value")).toEqual([])
    const queryBarcodeEmptyResponse = await client.query(queryBarcodeEmpty,1,50,true)
    expect(parseInt(queryBarcodeEmptyResponse.numberOfRecords)).toBe(smallRecordCount)
  }); 
  
  test('more than 10000 results', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async() => mockExplain
    }).mockResolvedValueOnce({
      text: async() => mockResponseHuge
    }).mockResolvedValueOnce({
      text: async() => mockResponseLarge
    }).mockResolvedValueOnce({
      text: async() => mockResponseZero
    }).mockResolvedValueOnce({
      text: async() => mockResponseLarge
    }).mockResolvedValueOnce({
      text: async() => mockResponseMedium
    }).mockResolvedValueOnce({
      text: async() => mockResponseMedium
    }).mockResolvedValueOnce({
      text: async() => mockResponseLarge
    }).mockResolvedValueOnce({
      text: async() => mockResponseMedium
    }).mockResolvedValueOnce({
      text: async() => mockResponseMedium
    })



    const client = new SRUClient(config)
    expect(client.config.baseurl).toBe(baseurl)
    expect(await client.connect()).toBe(true)

    const queryResponse = await client.query(query,10001,50)
    expect(parseInt(queryResponse.numberOfRecords)).toBe(hugeRecordCount)
  }); 
});
