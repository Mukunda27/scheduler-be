const socketIo = require("socket.io");
const tokenUtilities = require("./utilities/token");
const User = require("./model/user");

createSocket = (server) => {
  let allOnlineUsers = [];
  const io = socketIo(server, {
    cors: {
      origin: process.env.SOCKET_URL,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("set-user", (authToken) => {
      tokenUtilities.verifyAuthToken(authToken, (err, decodedToken) => {
        if (err) {
          socket.emit("auth-error", {
            status: 500,
            error: "Please provide correct auth token",
          });
        } else {
          let currentUser = {
            userID: decodedToken.userID,
            userName: decodedToken.userName,
          };
          socket.userID = currentUser.userID;
          socket.join(currentUser.userID);
          socket.join("todo-app");

          console.log(`${currentUser.userName} is online`);
          allOnlineUsers.push(currentUser);
          console.log(allOnlineUsers);

          io.in("todo-app").emit("online-users", allOnlineUsers);
        }
      });
    });

    socket.on("status-change", (message) => {
      getAllFriends(socket.userID)
        .then((friends) => {
          friends.forEach((friend) => {
            io.to(friend._id.toString()).emit("status-changed", message);
          });
        })
        .catch((err) => {
          console.log(err);
        });
    });

    socket.on("disconnect", () => {
      console.log("user is disconnected");
      var removeIndex = allOnlineUsers
        .map(function (user) {
          return user.userID;
        })
        .indexOf(socket.userID);
      allOnlineUsers.splice(removeIndex, 1);
      console.log(allOnlineUsers);
      socket.leave("todo-app");
      io.in("todo-app").emit("online-users", allOnlineUsers);
    });
  });
};

const getAllFriends = async (userID) => {
  let accountUser = await User.findOne({ _id: userID })
    .populate({ path: "friends", select: "_id name email" })
    .exec();
  return accountUser.friends;
};

module.exports = {
  createSocket: createSocket,
};
