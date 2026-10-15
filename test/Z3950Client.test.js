
import { expect, jest, test } from '@jest/globals';
import { Z3950Client } from '../Z3950Client.js';
import { EventEmitter } from 'events';
import asn1js from 'asn1js';
import net from 'net'

const config = {
    "host": "qumran.deadsea.ac.il",
    "database": "SCROLLS",
    "port": 1946,
    "username": "Isaiah",
    "password": "M@her5halal#baz",
    "details": {
        "recnoIndex": 1007,
        "recnoNumeric": true, 
        "defaultStructure": 6
    }
}

const mockInitResponse = new Uint8Array([181,102,131,2,0,224,132,3,0,193,2,133,4,4,
    0,0,0,134,4,4,0,0,0,140,1,1,159,110,2,56,49,159,111,13,77,101,116,97,112,114,
    111,120,121,47,89,65,90,159,112,54,49,46,50,50,46,52,47,53,46,51,55,46,51,32,
    102,52,100,50,54,52,98,49,50,97,102,99,56,54,49,101,52,56,99,102,100,55,102,55,
    101,57,56,101,98,100,57,53,102,99,55,54,55,57,100,99])

const mockSearchResponse = new Uint8Array([183,18,151,1,1,152,1,0,153,1,1,150,1,1,154,1,0,155,1,0])

const mockPresentResponse = new Uint8Array([185,128,152,1,1,153,1,2,155,1,0,188,128,48,128,
    128,3,78,65,70,161,128,161,128,40,128,6,7,42,134,72,206,19,5,10,129,130,1,49,48,48,51,48,
    53,110,122,32,32,97,50,50,48,48,49,50,49,110,32,32,52,53,48,48,48,48,49,48,48,49,51,48,48,
    48,48,48,48,48,51,48,48,48,52,48,48,48,49,51,48,48,53,48,48,49,55,48,48,48,49,55,48,48,56,48,
    48,52,49,48,48,48,51,52,48,49,48,48,48,49,55,48,48,48,55,53,48,52,48,48,48,50,49,48,48,48,57,
    50,49,48,48,48,48,50,51,48,48,49,49,51,54,55,48,48,48,52,55,48,48,49,51,54,30,110,98,50,48,48,
    53,48,49,48,50,52,56,30,68,76,67,30,50,48,50,53,48,56,48,53,48,52,51,53,52,51,46,55,30,48,53,48,
    55,50,53,110,124,32,97,122,97,110,110,97,97,98,110,32,32,32,32,32,32,32,32,32,32,124,110,32,97,97,
    97,32,32,32,32,32,32,30,32,32,31,97,110,98,50,48,48,53,48,49,48,50,52,56,30,32,32,31,97,85,107,31,
    98,101,110,103,31,101,114,100,97,31,99,85,107,30,49,32,31,97,72,117,100,115,111,110,44,32,74,46,
    32,70,114,97,110,99,105,115,30,32,32,31,97,82,97,98,115,104,97,107,101,104,44,32,49,57,57,55,58,31,
    98,116,46,112,46,32,40,74,46,32,70,114,97,110,99,105,115,32,72,117,100,115,111,110,41,30,29,0,0,0,
    0,0,0,0,0,0,0,0,0])

const mockMARCTest = "Rabshakeh"

const queryString = 'author = "Rabshekah" AND language = "heb" AND subject = "Sennacherib"'

describe('Z39.50 Client', () => {
    let createConnectionSpy;
    let mockSocket;
    let client;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSocket = new EventEmitter();
        mockSocket.latestData = ""
        mockSocket.setTimeout = jest.fn();
        mockSocket.write = jest.fn((data) => { 
            mockSocket.latestData = data
            if(data.length == toByteArray(client.createSearchRequest(config.database,1,queryString)).length) {
                mockSocket.emit('data', mockSearchResponse)
            } else if(data.length == toByteArray(client.createPresentRequest(1,1,1)).length) {
                mockSocket.emit('data', mockPresentResponse)
            }
        });
        mockSocket.end = jest.fn();
        mockSocket.destroy = jest.fn();

        createConnectionSpy = jest.spyOn(net, 'createConnection')
            .mockImplementation(({port: port, host: host}) => {
                mockSocket.remoteAddress = host
                mockSocket.remotePort = port    
                mockSocket.readyState = "open"        
                return mockSocket
            });
    });

   function toByteArray(asn1object) {
        return new Uint8Array(asn1object.toBER())
    }

    test('connect, reconnect and disconnect', async() => {
        client = new Z3950Client(config)
        expect(client.config).toEqual(config)
        client.connect()
        mockSocket.emit('connect')
        expect(createConnectionSpy).toHaveBeenCalledWith({host: config.host, port: config.port})        
        expect(mockSocket.latestData).toEqual(toByteArray(client.createInitRequest(config.username,config.password)))
        mockSocket.emit('data', mockInitResponse)
        expect(client.isConnected()).toBe(true)
        
        //reconnect
        client.connect(true)
        mockSocket.emit('connect')
        expect(createConnectionSpy).toHaveBeenCalledWith({host: config.host, port: config.port}) 
        mockSocket.emit('data', mockInitResponse)
        expect(client.isConnected()).toBe(true)

        //redundant connect (does not call createConnection)
        createConnectionSpy.mockClear()
        client.connect()
        expect(createConnectionSpy).not.toHaveBeenCalled()
        expect(client.isConnected()).toBe(true)

        //disconnect
        client.disconnect()
        mockSocket.emit('close')
        expect(mockSocket.latestData).toEqual(toByteArray(client.createCloseRequest()))
        expect(client.isConnected()).toBe(false)
    })

    test('simple query', async() => {
        const { username, password, ...configNoCredentials } = config
        client = new Z3950Client(configNoCredentials)
        client.connect()
        mockSocket.emit('connect')   
        expect(mockSocket.latestData).toEqual(toByteArray(client.createInitRequest("","")))
        mockSocket.emit('data', mockInitResponse)
        expect(client.isConnected()).toBe(true)

        const searchRequest = toByteArray(client.createSearchRequest(config.database,1,queryString))
        expectedLength = searchRequest.length
        const searchResults = await client.query(queryString,1,1)    
        expect(searchResults.numberOfRecords).toBe(1)
        expect(searchResults.records[0]).toContain(mockMARCTest)

        //timeout
        mockSocket.emit('timeout')
        expect(client.isConnected()).toBe(false)

    })
})