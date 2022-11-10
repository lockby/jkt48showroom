import redirectSSL from "redirect-ssl";
export default defineNitroPlugin(({ h3App }) => {
  if (!process.env.IS_DEV) h3App.use(fromNodeMiddleware(redirectSSL));
  // h3App.use(
  //   fromNodeMiddleware(
  //     cors({
  //       origin: "http://localhost:3000",
  //       credentials: true,
  //     })
  //   )
  // );
  // h3App.use(fromNodeMiddleware(function (req, res, next) {
  //   res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  //   res.header("Access-Control-Allow-Credentials", true);
  //   res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  //   res.header(
  //     "Access-Control-Allow-Headers",
  //     "Origin,X-Requested-With,Content-Type,Accept,content-type,application/json"
  //   );
  //   next();
  // }));
});
