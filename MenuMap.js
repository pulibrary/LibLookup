import { DOMParser } from '@xmldom/xmldom'
import * as xpath from 'xpath'
import zIndexes from './Z3950Indexes.json' with { type: 'json' };


const sruNamespaces = {
  "srw": "http://www.loc.gov/zing/srw/",
  "explain": "http://explain.z3950.org/dtd/2.0/",
  "ns": "http://explain.z3950.org/dtd/2.1/"
}

const defaultIndexes = [
    {name:"Keyword",code:"keyword",relators:["all","="]},
    {name:"Title",code:"title",relators:["all","=","=="]},
    {name:"Author",code:"author",relators:["all","=","=="]},
    {name:"Subject",code:"subject",relators:["all","="]},
    {name:"ISBN",code:"isbn",relators:["="]},
    {name:"ISSN",code:"issn",relators:["="]},
    {name:"Publication Date",code:"date",relators:["=",">",">=","<","<="]},
    {name:"Language",code:"lang",relators:["="]},
    {name:"Record #",code:"recno",relators:["="]},
    {name:"Raw Query",code:"raw",relators:["="]}
]

export class MenuMap {
    
    menuMap = {}
    
    constructor() {

    }

    static async create(catalogList) {
        var mmObj = new MenuMap
        const keys = Object.keys(catalogList)
        const values = Object.values(catalogList)
        for(var i = 0; i < keys.length; i++) {
            var catkey = keys[i]
            var catalogInfo = values[i]
            mmObj.menuMap[catkey] = {}
            if(Object.hasOwn(catalogInfo,'indexes')) {
                mmObj.menuMap[catkey] = {"primary": catalogInfo.indexes}
            } else {
                mmObj.menuMap[catkey] = {"primary": defaultIndexes}
            }
            if(catalogInfo.type == "z3950") {
                if(Object.hasOwn(zIndexes,catkey)) {
                    mmObj.menuMap[catkey].secondary = zIndexes[catkey]
                }
            } else if(catalogInfo.type == "almasru") {
                const explainResponse = await fetch(catalogInfo.baseurl + "?version=1.2&operation=explain")
                const explainText = await explainResponse.text()
                const parser = new DOMParser()
                const explainXML = parser.parseFromString(explainText, "text/xml");
                const selectWithNs = xpath.useNamespaces(sruNamespaces)
                var secondaryIndexes = []
                var indexes = selectWithNs('//explain:index', explainXML)
                indexes.forEach(async (ind) => {                  
                    const name = selectWithNs('.//ns:title/text()',ind)[0].nodeValue
                    const prefix = selectWithNs('.//explain:map/explain:name/@set',ind)[0].nodeValue
                    const code = selectWithNs('.//explain:map/explain:name/text()',ind)[0].nodeValue
                    const relators = selectWithNs('.//explain:configInfo/explain:supports',ind)
                    const relatorList = relators.map(rel => {
                        var textValue = selectWithNs('.//text()',rel)
                        if(textValue.length > 0) {
                            return textValue[0].nodeValue
                        }  else {
                            return "empty"
                        }                      
                    })
                    secondaryIndexes.push({"name":name,"code":`${prefix}.${code}`,"relators":relatorList})
                })
                mmObj.menuMap[catkey].secondary = secondaryIndexes
            }

            if(Object.hasOwn(catalogInfo,"resultFields")) {
                mmObj.menuMap[catkey].resultFields = catalogInfo.resultFields
            } else {
                mmObj.menuMap[catkey].resultFields = []
            }
        }
        return mmObj
    }
    getJSON() {
        return JSON.stringify(this.menuMap,null,2)
    }
}