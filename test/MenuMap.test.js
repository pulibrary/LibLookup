import { expect, jest, test } from '@jest/globals';
import { MenuMap } from '../MenuMap.js'
import zIndexes from '../Z3950Indexes.json' with { type: 'json' };

const config = {
    "Enterprise-D": {
        "type": "custom",
        "indexes": [
            {"name":"Holodeck ID", "code":"hdid", "relators":["="]},
            {"name":"Stardate", "code":"stardate","relators":["<","=",">"]}
        ]
    },
    "Voyager": {
        "type": "custom",
        "resultFields": [
            {"name":"Quadrant", "code": "quadrant", "value":"$.attributes.quadrant"}
        ]
    },
    "LCNAF": {
        "name": "LC Name Authority File",
        "type": "z3950",
        "indexes": [
            {"name":"Keyword","code":"keyword","relators":["all","="]},
            {"name":"Record #","code":"recno"},
            {"name":"Title","code":"title","relators":["all","="]},
            {"name":"Author","code":"author","relators":["all","="]},
            {"name":"Raw Query","code":"raw", "relators":["="]}
        ]
    },
    "SFNAF": {
        "name": "Starfleet Name Authority File",
        "type": "z3950",
        "indexes": [
            {"name":"Keyword","code":"keyword","relators":["all","="]},
            {"name":"Record #","code":"recno"},
            {"name":"Title","code":"title","relators":["all","="]},
            {"name":"Author","code":"author","relators":["all","="]},
            {"name":"Raw Query","code":"raw", "relators":["="]}
        ]
    },
    "Farragut": {
        "type": "almasru",
        "indexes": [
            {"name":"Keyword","code":"keyword","relators":["all","="]},
            {"name":"Record #","code":"recno"}
        ]
    }
}

const mockExplain = `<explainResponse xmlns="http://www.loc.gov/zing/srw/"><record><recordData>
    <explain xmlns="http://explain.z3950.org/dtd/2.0/" xmlns:ns="http://explain.z3950.org/dtd/2.1/">
    <indexInfo><set identifier="marcxml" name="alma"/>
    <index><ns:title>Stardate</ns:title><map><name set="alma">starDate</name></map>
    <configInfo><supports type="relation">all</supports><supports type="relation">&gt;</supports>
    <supports type="relation">&lt;</supports><supports type="emptyTerm"/></configInfo>
    </index></indexInfo></explain></recordData></record></explainResponse>`

const explainJSON = {"code": "alma.starDate", "name": "Stardate", "relators": ["all", ">", "<", "empty"]}

var fetchSpy
beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
});

afterEach(() => {
    fetchSpy.mockRestore();
});


describe('Menu Map', () => {
    test('All Clients', async () => {
        fetchSpy.mockResolvedValue({
            ok: true,
            status: 200,
            text: async() => {return mockExplain}
        });
        const mmObj = await MenuMap.create(config)
        const menuMap = mmObj.menuMap
        expect(menuMap["Enterprise-D"].primary).toEqual(config["Enterprise-D"].indexes)
        expect(menuMap["Voyager"].primary).toContainEqual({name:"Title",code:"title",relators:["all","=","=="]})
        expect(menuMap["Voyager"].resultFields).toEqual(config["Voyager"].resultFields)
        expect(menuMap["LCNAF"].primary).toEqual(config["LCNAF"].indexes)
        expect(menuMap["LCNAF"].secondary).toContainEqual({"name":"Note","code":63})
        expect(menuMap["SFNAF"].secondary).toBeUndefined()
        expect(menuMap["Farragut"].primary).toContainEqual({"name":"Keyword","code":"keyword","relators":["all","="]})
        expect(menuMap["Farragut"].secondary).toContainEqual(explainJSON)

        const mmJSON = JSON.parse(mmObj.getJSON())
        expect(Object.keys(mmJSON)).toEqual(Object.keys(config))
    })    
})