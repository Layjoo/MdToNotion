module.exports = class NotionBlock {
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

}

// module.exports = class Block{
//     paragraph = {
//         "type": "paragraph",
//         "paragraph": {
//           "text": [{
//             "type": "text",
//             "text": {
//               "content": "Lacinato kale",
//               "link": null
//             }
//           }],
//           "children":[]
//         }
//     }

//     heading_1 = {
//         "type": "heading_1",
//         "heading_1": {
//           "text": [{
//             "type": "text",
//             "text": {
//               "content": "Lacinato kale",
//               "link": null
//             }
//           }]
//         }
//     }

//     heading_2 = {
//         "type": "heading_2",
//         "heading_2": {
//           "text": [{
//             "type": "text",
//             "text": {
//               "content": "Lacinato kale",
//               "link": null
//             }
//           }]
//         }
//     }

//     heading_3 = {
//         "type": "heading_3",
//         "heading_3": {
//           "text": [{
//             "type": "text",
//             "text": {
//               "content": "Lacinato kale",
//               "link": null
//             }
//           }]
//         }
//     }

//     bulleted_list_item = {
//         "type": "bulleted_list_item",
//         "bulleted_list_item": {
//           "text": [{
//             "type": "text",
//             "text": {
//               "content": "Lacinato kale",
//               "link": null
//             }
//           }],
//           "children":[{
//             "type": "paragraph"
//           }]
//         }
//     }

//     numbered_list_item = {
//         "type": "numbered_list_item",
//         "numbered_list_item": {
//           "text": [{
//             "type": "text",
//             "text": {
//               "content": "Lacinato kale",
//               "link": null
//             }
//           }],
//           "children":[{
//             "type": "paragraph"
//           }]
//         }
//     }

//     callout = {
//         "type": "callout",
//         "callout": {
//         "text": [{
//           "type": "text",
//           "text": {
//             "content": "Lacinato kale",
//           },
//           "icon": {
//             "emoji": "⭐"
//            },
//         }],
//        }
//     }

//     quote = {
//         "type": "quote",
//         "quote": {
//             "text": [{
//             "type": "text",
//             "text": {
//                 "content": "Lacinato kale",
//             },
//         }],
//        }
//     }

// }