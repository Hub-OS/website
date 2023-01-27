import { NextApiRequest, NextApiResponse } from "next";
import { setCookie } from "cookies-next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method != "POST") {
    res.status(400).send({});
    return;
  }

  setCookie("token", req.body?.token, { req, res, maxAge: 60 * 60 * 24 * 30 });
  res.status(200).send("");
}
