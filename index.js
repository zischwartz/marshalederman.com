const fs = require("fs");
const path = require("path");

const request = require("request");
const render = require("es6-template-render");

const index_template = fs.readFileSync(
  path.resolve(__dirname, "src/index.html"),
  "utf8"
);

// let items_sheet_url =
//   "https://sheets.googleapis.com/v4/spreadsheets/SPREADSHEET_ID/WORKSHEET_TAB_NAME?key=YOUR_API_KEY";

let items_sheet_url =
  "https://sheets.googleapis.com/v4/spreadsheets/12V1CZtjXPIio2Ar3-5Vd0DpGnjxYe2jL1jHgc1Zpk_o/values/items?key=AIzaSyAqttGhmNJpCrkhJ3Qnj9KHFmTeL8KXjuI";

request(items_sheet_url, function(error, response, body) {
  // console.log("error:", error); // Print the error if one occurred
  // console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
  // console.log("body:", body); // Print the HTML for the Google homepage.
  let body_obj = JSON.parse(body);
  let items = create_item_objects_from_raw(body_obj.values);
  create_site(items);
});

function create_item_objects_from_raw(values) {
  let result = [];
  let headings = values.shift();
  for (row of values) {
    let item = {};
    for (var i = 0; i < headings.length; i++) {
      let v = row[i];
      item[headings[i]] = v;
    }
    item["slug"] = slugify(item.title);
    result.push(item);
    // console.log(row);
  }
  return result;
}

function create_site(items) {
  let title = "Marsha Lederman";
  // doh, right it can't do arrays
  let index_items_content = create_index_items_content(items);
  fs.writeFileSync(
    `dist/index.html`,
    render(index_template, { index_items_content, title })
  );
}

console.log(process.env.NODE_ENV);

function create_index_items_content(items) {
  let result = "";
  for (var i = 0; i < items.length; i++) {
    let piece = items[i];
    // for local testing
    let src =
      process.env.NODE_ENV != "production"
        ? `../images/${piece.cover_image}`
        : `images/${piece.cover_image}`;
    // for prod, we'll need a thing to copy all the images over to dist
    result += `<a href="${piece.slug}/"><img src="${src}"></a>`;
  }
  return result;
}

function slugify(text, retain_dots = false) {
  let reg_ex = retain_dots ? /[^\w\s-\.]/g : /[^\w\s-]/g;
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(reg_ex, "") // except '.' depending on retain_dots, remove non-word [a-z0-9_], non-whitespace, non-hyphen characters
    .replace(/[\s_-]+/g, "_") // swap any length of whitespace, underscore, hyphen characters with a single _
    .replace(/^-+|-+$/g, ""); // remove leading, trailing -
}
