const notionObj = require("./notionObject");

module.exports = class parserMd{
    
    #parserToRichTextObj = (text) => {
        var newArr = [];
        const regex = {
            highlight:/==.+?==/g,
            bold: /\*\*.+?\*\*/g,
            code: /`.+?`/g,
        }

        //check and get array of text that matched with regex
        for(i in regex){ 
            if(regex[i].test(text)){
                newArr.push(...text.match(regex[i]))
                newArr = [...new Set(newArr)]
            }
        }

        //replace matched regex with "|"
        for(let i=0; i<newArr.length; i++){
            if(regex.bold.test(newArr[i])){
                text = text.replace(new RegExp(regex.bold),"|" + newArr[i] + "|");
            }
            else{
                text = text.replace(new RegExp(newArr[i],"g"),"|" + newArr[i] + "|");
            }
        }
        
        //get arrray of each seperate type of regex
        const listOfText = text.split("|");

        //return array of object for each seperate type of annotation and content
        var modifiedText = [];
        for(var i=0; i<listOfText.length; i++){
            if(regex.bold.test(listOfText[i])){
                const content = listOfText[i].replace(/\*/g,"")
                const richTextObj = new notionObj().richTextObj;
                richTextObj.plain_text = content;
                richTextObj.annotations["bold"] = true;
                richTextObj.text.content = content;
                modifiedText.push(richTextObj);
            }
            else if(regex.code.test(listOfText[i])){
                const content = listOfText[i].replace(/`/g,"")
                const richTextObj = new notionObj().richTextObj;
                richTextObj.plain_text = content;
                richTextObj.annotations["code"] = true;
                richTextObj.text.content = content;
                modifiedText.push(richTextObj);
            }
            else if(regex.highlight.test(listOfText[i])){
                const content = listOfText[i].replace(/==/g,"")
                const richTextObj = new notionObj().richTextObj;
                richTextObj.plain_text = content;
                richTextObj.annotations["code"] = true;
                richTextObj.text.content = content;
                modifiedText.push(richTextObj);
            }
            else{
                const richTextObj = new notionObj().richTextObj;
                richTextObj.plain_text = listOfText[i];
                richTextObj.text.content = listOfText[i];
                modifiedText.push(richTextObj);
            }
        }

        return modifiedText;
    }

    parserMdToNotionObj = (text) => {
        //notion block object style
        var blockObj = [
            new notionObj().blockObj,
        {
            isChild: false,
            level: 0
        }
        ]

        //check level of child object
        const tabRegex =/\t/g
        if(tabRegex.test(text)){
            const levelOfnestedChild = text.match(tabRegex).length;
            text = text.replace(tabRegex, "");
            blockObj[1].isChild = true;
            blockObj[1].level = levelOfnestedChild;
        }
    
        //check if text have a ---  this gonnabe a divider 
        const dividerRegex = /---/
        if(dividerRegex.test(text)){
            delete blockObj[0].paragraph;
            blockObj[0].type = "divider";
            blockObj[0]["divider"] = {}; //divider contain empty obj;
            return blockObj;
        }

        const heading_1 = /^#\s/;
        if(heading_1.test(text)){
            blockObj[0].type = "heading_1";
            const content =  text.replace(heading_1, "");
            blockObj[0].paragraph.text = this.#parserToRichTextObj(content);
            blockObj[0]["heading_1"] = blockObj[0].paragraph; // change property name
            delete blockObj[0].paragraph;
            return blockObj;
        }

        const heading_2 = /^##\s/;
        if(heading_2.test(text)){
            blockObj[0].type = "heading_2";
            const content =  text.replace(heading_2, "");
            blockObj[0].paragraph.text = this.#parserToRichTextObj(content);
            blockObj[0]["heading_2"] = blockObj[0].paragraph; // change property name
            delete blockObj[0].paragraph;
            return blockObj;
        }

        const heading_3 = /^###\s/;
        if(heading_3.test(text)){
            blockObj[0].type = "heading_3";
            const content =  text.replace(heading_3, "");
            blockObj[0].paragraph.text = this.#parserToRichTextObj(content);
            blockObj[0]["heading_3"] = blockObj[0].paragraph; // change property name
            delete blockObj[0].paragraph;
            return blockObj;
        }

        const bulleted_list_item = /^-\s/;
        if(bulleted_list_item.test(text)){
            blockObj[0].type = "bulleted_list_item";
            const content =  text.replace(bulleted_list_item, "");
            blockObj[0].paragraph.text = this.#parserToRichTextObj(content);
            blockObj[0]["bulleted_list_item"] = blockObj[0].paragraph; // change property name
            delete blockObj[0].paragraph;
            return blockObj;
        }

        blockObj[0].paragraph.text = this.#parserToRichTextObj(text); //normal text object
        return blockObj;
    }

}
