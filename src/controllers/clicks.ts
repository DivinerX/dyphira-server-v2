import { Click } from "@/models/click";
import { User } from "@/models/user";
import { Request, Response } from "express";
import type { JwtPayload } from 'jsonwebtoken';

export const getClicks = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as JwtPayload)._id;
    const user = await User.findById(userId).populate('fund');
    const click = await Click.findOne({ referralCode: user?.fund.referralCode });
    if (!click) {
      return res.status(404).json({ message: "Click not found" });
    }
    else {
      return res.status(200).json(click);
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Error fetching click:", error });
  }
}