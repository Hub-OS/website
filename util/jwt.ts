import jwt from "jsonwebtoken";

const JWT_KEY = process.env.JWT_SECRET!;

export async function signJwt(payload: string | object | Buffer) {
  return new Promise((resolve) =>
    jwt.sign(
      payload,
      JWT_KEY,
      { algorithm: "RS256", expiresIn: "2w" },
      (err, value) => {
        resolve(value);
      }
    )
  );
}

export async function verifyJwt(
  token: string
): Promise<string | jwt.JwtPayload | undefined> {
  return new Promise((resolve) => {
    if (!token) {
      resolve(undefined);
      return;
    }

    jwt.verify(token, JWT_KEY, { algorithms: ["RS256"] }, (err, value) => {
      resolve(value);
    });
  });
}
