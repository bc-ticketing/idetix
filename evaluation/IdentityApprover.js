module.exports = class IdentityApprover {
  constructor(title, method, url, twitter) {
    this.title = title;
    this.methods = method;
    this.url = url;
    this.twitter = twitter;
  }

  toJsonSchema() {
    return JSON.stringify({
      version: "1.0",
      approver: {
        title:this.title,
        methods: this.methods,
        url: this.mapping,
        twitter: this.twitter
      }
    });
  }
}
