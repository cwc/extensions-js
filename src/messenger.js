/* globals Twitch */
import { ENVIRONMENTS, CurrentEnvironment } from './util';

let Pusher = null;
if (CurrentEnvironment() !== ENVIRONMENTS.SERVER) {
  Pusher = require('pusher-js'); // eslint-disable-line global-require
}

// TwitchMessenger implements the basic 'messenger' interface, which should be implemented
// for all pubsub implementations. This is used by SDK to provide low-level access
// to a pubsub implementation.
class TwitchMessenger {
  constructor() {
    this.channelID = '';
  }

  /**
   * send will send a message to all clients.
   * @param id the extension id or app id of the app thats sending the message.
   * @param event an event name. Event names should be in the form [a-z0-9_]+
   * @param either 'broadcast' or 'whisper-<opaque-user-id>'
   * @param body a json object to send
   * @param client a state-client instance. Used to make external calls.
   * The twitch messenger does not need the client, so its not shown in the signature
   * below.
   */
  /* eslint-disable class-methods-use-this */
  send(id, event, target, body) {
    const data = body || {};
    Twitch.ext.send(target, 'application/json', {
      event: `${id}:${event}`, data
    });
  }
  /* eslint-enable class-methods-use-this */

  /**
   * listen is the low level listening interface.
   * @param id the extension id or app id of the app thats sending the message.
   * @param topic either `broadcast` or `whisper-<opaque-user-id>`.
   * @param callback a function(body)
   * @return a handle that can be passed into unlisten to unbind the callback.
   */
  /* eslint-disable class-methods-use-this */
  listen(id, topic, callback) {
    const cb = (t, datatype, message) => {
      try {
        const parsed = JSON.parse(message);
        callback(parsed);
      } catch (err) {
        // TODO: Silent failure?
      }
    };

    Twitch.ext.listen(topic, cb);

    return {
      target: topic,
      cb
    };
  }
  /* eslint-enable class-methods-use-this */

  /**
   * unlisten will unregister a listening callback.
   * @param id the extension id or app id of the app thats sending the message.
   * @param h the handle returned from listen
   */
  /* eslint-disable class-methods-use-this */
  unlisten(id, h) {
    Twitch.ext.unlisten(h.target, h.cb);
  }
  /* eslint-enable class-methods-use-this */
}

// PusherMessenger adheres to the 'messenger' interface, but uses https://pusher.com
// as a pubsub notification provider.
class PusherMessenger {
  constructor(ch, muxy) {
    this.client = new Pusher('18c26c0d1c7fafb78ba2', {
      cluster: 'us2',
      encrypted: true
    });

    this.muxy = muxy;
    this.channelID = '';
  }

  send(id, event, target, body, client) {
    client.signedRequest(id, 'POST', 'pusher_broadcast', JSON.stringify({
      target,
      event,
      user_id: this.channelID,
      data: body
    }));
  }

  listen(id, topic, callback) {
    if (!this.channel) {
      const channelName = `twitch.pubsub.${this.extensionID}.${this.channelID}`;
      this.channel = this.client.subscribe(channelName);
    }

    const cb = (message) => {
      try {
        const parsed = JSON.parse(message.message);
        callback(parsed);
      } catch (err) {
        // TODO: Silent failure?
      }
    };

    this.channel.bind(topic, cb);

    return {
      target: topic,
      cb
    };
  }

  unlisten(id, h) {
    this.channel.unbind(h.target, h.cb);
  }
}

// ServerMessenger implements a 'messenger' that is broadcast-only. It cannot
// listen for messages, but is able to send with a backend-signed JWT.
class ServerMessenger {
  constructor(ch, muxy) {
    this.channelID = ch;
    this.muxy = muxy;
  }

  send(id, event, target, body, client) {
    client.signedRequest(id, 'POST', 'broadcast',
      JSON.stringify({
        target,
        event,
        user_id: this.channelID,
        data: body
      }));
  }

  /* eslint-disable class-methods-use-this,no-console */
  listen() {
    console.error('Server-side message receiving is not implemented.');
  }

  unlisten() {
    console.error('Server-side message receiving is not implemented.');
  }
  /* eslint-enable class-methods-use-this,no-console */
}

export default function Messenger() {
  switch (CurrentEnvironment()) {
    case ENVIRONMENTS.DEV:
    case ENVIRONMENTS.TESTING:
      return new PusherMessenger();
    case ENVIRONMENTS.STAGING:
    case ENVIRONMENTS.PRODUCTION:
      return new TwitchMessenger();
    case ENVIRONMENTS.SERVER:
      return new ServerMessenger();
    default:
      console.error('Could not determine execution environment.'); // eslint-disable-line no-console
  }
}
