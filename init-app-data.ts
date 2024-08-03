const axios = require('axios');
const MongoClient = require('mongodb').MongoClient

type InitApp = {
    getHackerNewsData: () => void
}
const hackerNewsBaseUrl = 'https://hacker-news.firebaseio.com/v0/';
const mongoUrl = 'mongodb://localhost:27017/hacker-news'

const initApp: InitApp = {
    getHackerNewsData: async () => {
        const perfStart = performance.now();
        console.log('START...', perfStart);

        const topItems = await getTopItems();
        const storiesData: any = await getStoriesForTopItems(topItems.data);
        const stories = storiesData
            .filter(story => story.status === 'fulfilled')
            .map(story => story.value.data);
        await saveAllToMongo('stories', stories);


        const perfEnd = performance.now();
        console.log('END...', perfEnd - perfStart);

        const storyComments = stories.flatMap(story => story.kids);

        const commentsData: any = await getCommentsForStories(storyComments);
        const comments = commentsData
            .filter(comment => comment.status === 'fulfilled')
            .map(comment => comment.value.data);

        await saveAllToMongo('comments', comments);
    }
}
const getTopItems = async () => {
    return await axios.get(`${hackerNewsBaseUrl}/topstories.json`);
};

const getStoriesForTopItems = async (topItems) => {
    return await Promise.allSettled(topItems.map(itemId => axios.get(`${hackerNewsBaseUrl}/item/${itemId}.json`)));
};

const getCommentsForStories = async (comments) => {
    return await Promise.allSettled(comments.map(commentId => axios.get(`${hackerNewsBaseUrl}/item/${commentId}.json`)));
};

const saveAllToMongo = async (collectionName, documentsList) => {
    const client = await MongoClient.connect(mongoUrl);

    let dbo = client.db();

    const collections = await dbo.listCollections().toArray();
    const collectionNames = collections.map(item => item.name);

    if (collectionNames.includes(collectionName)) {
        const drop = await dbo.collection(collectionName).drop();
    }

    await dbo.collection(collectionName).insertMany(documentsList);
    await client.close();
}

module.exports = initApp
