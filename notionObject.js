class NotionObject {
    pageObj = {
      parent: {
        database_id: null,
      },
      icon: {
          type: "emoji",
          emoji: "🔗"
      },
      cover: null,
      properties: {
          Name: {
              title: [
                  {
                      text: {
                      content: "",
                      },
                  },
              ],
          },
      },
    }

    blockObj = {
      object: 'block',
      type: 'paragraph',
      paragraph: {
      text: [
              {
                  type: 'text',
                  text: {
                      content: "",
                  },
              },
          ],
      },
    }

    richTextObj = {
        type: 'text',
        text: { content: 'annnotation', link: null },
        annotations: {
            italic: false,
            strikethrough: false,
            underline: false,
            color: 'default',
            code: false,
            bold: false,
        },
        plain_text: 'annnotation',
        href: null
    }

    mentionObj = {
        type: 'mention',
        mention: { type: 'page', page: { id: '9777d88c02424e459548b2f7d4f3661b' } },
      }

}

class Block{
  paragraph = {
      "type": "paragraph",
      "paragraph": {
        "text": [],
        // "children":[]
      }
  }

  heading_1 = {
      "type": "heading_1",
      "heading_1": {
        "text": []
      }
  }

  heading_2 = {
      "type": "heading_2",
      "heading_2": {
        "text": []
      }
  }

  heading_3 = {
      "type": "heading_3",
      "heading_3": {
        "text": []
      }
  }

  bulleted_list_item = {
      "type": "bulleted_list_item",
      "bulleted_list_item": {
        "text": [{
          "type": "text",
          "text": {
            "content": "Lacinato kale",
            "link": null
          }
        }],
        // "children":[]
      }
  }

  numbered_list_item = {
      "type": "numbered_list_item",
      "numbered_list_item": {
        "text": [{
          "type": "text",
          "text": {
            "content": "Lacinato kale",
            "link": null
          }
        }],
        // "children":[]
      }
  }

  callout = {
      "type": "callout",
      "callout": {
      "text": null,
      }
  }

  quote = {
      "object": 'block',
      "type": "quote",
      "quote": {
          "text": null,
      }
  }

  divider = {
    "type": "divider",
    "divider": {}
  }

}

module.exports = {
  NotionObject, Block
}