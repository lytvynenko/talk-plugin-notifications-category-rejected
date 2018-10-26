const { get } = require("lodash");
const path = require("path");

const handle = async (ctx, comment) => {
  // Check to see if this is a reply to an existing comment.
  const commentID = get(comment, "id", null);
  if (commentID === null) {
    ctx.log.info("could not get comment id");
    return;
  }

  // Execute the graph request.
  const reply = await ctx.graphql(
    `
      query GetAuthorUserMetadata($comment_id: ID!) {
        comment(id: $comment_id) {
          id
          user {
            id
            notificationSettings {
              onRejected
            }
          }
        }
      }
    `,
    { comment_id: commentID }
  );
  if (reply.errors) {
    ctx.log.error({ err: reply.errors }, "could not query for author metadata");
    return;
  }

  // Check if the user has notifications enabled.
  const enabled = get(
    reply,
    "data.comment.user.notificationSettings.onRejected",
    false
  );
  if (!enabled) {
    return;
  }

  const userID = get(reply, "data.comment.user.id", null);
  if (!userID) {
    ctx.log.info("could not get comment user id");
    return;
  }

  // The user does have notifications for rejected comments enabled, queue the
  // notification to be sent.
  return { userID, date: comment.updated_at, context: comment.id };
};

const hydrate = async (ctx, category, context) => {
  const reply = await ctx.graphql(
    `
      query GetNotificationData($context: ID!) {
        comment(id: $context) {
          id
          body
          asset {
            title
            url
          }
        }
      }
    `,
    { context }
  );
  if (reply.errors) {
    throw reply.errors;
  }

  const comment = get(reply, "data.comment");
  const headline = get(comment, "asset.title", null);
  const assetURL = get(comment, "asset.url", null);

  return [headline, comment.body, assetURL];
};

const handler = {
  handle,
  category: "rejected",
  event: "commentRejected",
  hydrate,
  digestOrder: 10
};

module.exports = {
  typeDefs: `
    type NotificationSettings {
      onRejected: Boolean!
    }

    input NotificationSettingsInput {
      onRejected: Boolean
    }
  `,
  resolvers: {
    NotificationSettings: {
      // onRejected returns false by default if not specified.
      onRejected: settings => get(settings, "onRejected", false)
    }
  },
  translations: path.join(__dirname, "translations.yml"),
  notifications: [handler]
};
