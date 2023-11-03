"use strict";

// |===================================================|
// |                     LOADER                        |
// |===================================================|
// | Loads spritesheets, iconsheets, and fontsheets as |
// | images and their accompanying jsons as atlases.   |
// |                                                   |
// | Loading is done all at once asynchronously before |
// | the game start, returning a list of promises.     |
// |                                                   |
// | * Resources must be added before loading.         |
// |===================================================|

class Loader {
    // * id's must be unique and map to assets
    urls;

    // * id's must be unique and map to urls
    assets;

    constructor() {
        this.urls = [];
        this.assets = {};

        this.add          = this.add.bind(this);
        this.remove       = this.remove.bind(this);
        this.load         = this.load.bind(this);
        this.get          = this.get.bind(this);
    }

    // add a url by id into urls and create a property in assets by id
    // * resource must include id, image path, and json path
    add(resource) {
        if (this.urls.find(url => url.id === resource.id)) {
            // this url already exists
            return;
        }
       
        this.urls.push({ id: resource.id, image: resource.image, json: resource.json });
        this.assets[resource.id] = { image: undefined, atlas: undefined };
    }

    // remove a url by id from urls and delete a property by id in assets
    remove(id) {
        if (!this.urls.find(url => url.id === id)) {
            // this url does not exist
            return;
        }
        this.urls.splice(this.urls.findIndex(function (url) {
            return url.id === id;
        }), 1);
        delete this.assets[id];
    }

    // load image and json resources into game assets by their id's in urls 
    // returns a list of resource loading promises to be awaited on
    load() {
        let promises = [];
        this.urls.forEach(element => {
            // load spritesheets, iconsheets, and fontsheets as image blobs
            promises.push(
                fetch(element.image)
                    .then(response => {
                        return response.blob();
                    })
                    .then(blob => {
                        var img = new Image();
                        img.src = URL.createObjectURL(blob);
                        this.assets[element.id].image = img;
                        return "success";
                    })
            );

            // load asset atlases from json
            promises.push(
                fetch(element.json)
                    .then(response => {
                        return response.json();
                    })
                    .then(json => {
                        this.assets[element.id].atlas = json;
                        return "success";
                    })
            );
        })

        // this allows us to await on resources before starting the game
        return Promise.all(promises);
    };

    // get assets by ids, either a single id or a list of id may be passed in
    // returns a single asset object or an assets object indexed by ids
    // return all assets if no id is specified
    get(ids = null) {
        if (ids === null) {
            return this.assets;
        }
        else if (Array.isArray(ids)) {
            let assets = {};
            ids.forEach((id) => { assets[id] = this.assets[id]; });
            return assets;
        }
        else {
            let asset = this.assets[ids];
            return asset;
        }
    }
}

export { Loader };