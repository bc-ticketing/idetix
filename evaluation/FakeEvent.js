const faker = require('faker');

module.exports = class FakeEvent{
  constructor() {
    this.title = faker.name.title() + " Event",
    this.location = faker.address.city(),
    this.category = faker.commerce.department(),
    this.description = faker.commerce.productDescription(),
    this.color = faker.internet.color(),
    this.time = faker.date.future().getTime() / 1000000,
    this.duration = "2h",
    this.url = "https://simonbachmann5.wixsite.com/mysite",
    this.twitter = "claudio3"
  }

  toJsonSchema() {
    return JSON.stringify({
      version: "1.0",
      event: {
        title: this.title,
        location: this.location,
        category: this.category,
        description: this.description,
        color: this.color,
        time: this.time,
        duration: this.duration,
        url: this.url,
        twitter: this.twitter
      }
    });
  }
}