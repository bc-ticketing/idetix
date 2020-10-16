const faker = require('faker');

const areaTypes = [
  "VIP",
  "Standard",
  "Normal",
  "Premium",
  "Budget",
  "Upgraded",
  "All-Inclusive"
]

const ticketType = [
  "Seating",
  "Standing",
  "Mixed",
  "Backstage",
  "Balcony",
  "Rooftop",
  "Dancefloor"
]

const duration = [
  "",
  "1-Day",
  "2-Day",
  "3-Day",
  "4-Day",
  "5-Day",
]

module.exports = class FakeTicket{
  constructor(eventAddress) {
    const randomDuration = FakeTicket.randomItem(duration);
    const randomArea = FakeTicket.randomItem(areaTypes);
    const randomType = FakeTicket.randomItem(ticketType);

    this.title = `${randomDuration} ${randomArea} ${randomType}`,
    this.description = `This ticket is valid for ${randomDuration} and you have access to the ${randomArea} ${randomType}.`,
    this.event = eventAddress,
    this.mapping = []
  }


  toJsonSchema() {
    return JSON.stringify({
      version: "1.0",
      event: {
        title:this.title,
        description: this.description,
        event: this.event,
        mapping: this.mapping
      }
    });
  }

  static randomItem(items) {
    return items[Math.floor(Math.random()*items.length)];
  }

}