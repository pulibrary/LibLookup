// Simple tokenizer to split by whitespace but preserve quoted strings
export function tokenize(str) {
    str = str.replaceAll(/""/g,"{quote}")
    const regex = /@\w+|@attr \d+=\d+|"([^"\\]|\\.)+"|[^\s]+/g;
    let matches = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
        matches.push(match[0].replaceAll("{quote}","\"\""));
    }
    return matches;
}

// Convert a single search term containing a vertical bar into a sset of search terms separated by OR
export function explodeTerm(searchstring) {
    const [index, operator, term] = tokenize(searchstring)
    const termsArray = term.replace(/^"(.*)"$/,'$1').split(/[|¦]/g)
    var newstring = ""
    for(var i = 0; i < termsArray.length; i++) {
        if(i > 0) {
            newstring += " OR "
        }
        newstring += `${index} ${operator} "${termsArray[i]}"`
    }
    return newstring
}