const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const Order = require("../model/order");
const Shop = require("../model/shop");
const Product = require("../model/product");
const sendMail = require("../utils/sendMail");

// create new order
router.post(
  "/create-order",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const {
        cart,
        shippingAddress,
        user,
        totalPrice,
        shipping,
        shopTotal,
        paymentInfo,
      } = req.body;
      // Check if the cart is empty
      if (!cart || cart.length === 0) {
        return next(
          new ErrorHandler("Giỏ hàng trống. Không thể tạo đơn hàng.", 400)
        );
      }
      //   group cart items by shopId
      const shopItemsMap = new Map();

      for (const item of cart) {
        const shopId = item.shopId;
        if (!shopItemsMap.has(shopId)) {
          shopItemsMap.set(shopId, []);
        }
        shopItemsMap.get(shopId).push(item);
      }

      // create an order for each shop
      const orders = [];

      for (const [shopId, items] of shopItemsMap) {
        const order = await Order.create({
          cart: items,
          shippingAddress,
          user,
          totalPrice,
          shipping,
          shopTotal,
          paymentInfo,
        });
        orders.push(order);
      }

      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
// get all orders of user
router.get(
  "/get-all-orders/:userId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find({ "user._id": req.params.userId }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get all orders of seller
router.get(
  "/get-seller-all-orders/:shopId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find({
        "cart.shopId": req.params.shopId,
      }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update order status for seller
router.put(
  "/update-order-status/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(
          new ErrorHandler("Đơn hàng không tìm thấy với ID này", 400)
        );
      }
      if (req.body.status === "Đơn hàng đã giao cho đơn vị vận chuyển") {
        order.cart.forEach(async (o) => {
          await updateOrder(o._id, o.qty);
        });
      }

      order.status = req.body.status;

      if (req.body.status === "Đã giao hàng") {
        order.deliveredAt = Date.now();
        order.paymentInfo.status = "Đã thanh toán";

        const serviceCharge = order.totalPrice * 0.05;
        await updateSellerInfo(order.shopTotal);
      }

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
      });

      async function updateOrder(id, qty) {
        const product = await Product.findById(id);

        product.stock -= qty;
        product.sold_out += qty;

        await product.save({ validateBeforeSave: false });
      }

      async function updateSellerInfo(shopTotal) {
        // Lặp qua danh sách cửa hàng trong shopTotal để cập nhật availableBalance
        for (const shopId in shopTotal) {
          if (shopTotal.hasOwnProperty(shopId)) {
            const amount = shopTotal[shopId].totalPrice;
            const seller = await Shop.findById(shopId);

            if (seller) {
              seller.availableBalance += amount - amount * 0.05;
              await seller.save();
            }
          }
        }
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);
// give a refund ----- user
router.put(
  "/order-refund/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(
          new ErrorHandler("Đơn hàng không tìm thấy với ID này", 400)
        );
      }

      order.status = req.body.status;
      const fiveDaysAgo = new Date();

      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      if (order.deliveredAt < fiveDaysAgo) {
        return next(
          new ErrorHandler(
            "Không thể yêu cầu hoàn tiền với đơn hàng đã qua 5 ngày",
            400
          )
        );
      }
      await order.save({ validateBeforeSave: false });

      try {
        console.log(order.user.email);
        await sendMail({
          email: order.user.email,
          subject: "Xác nhận yêu cầu hoàn tiền",
          message: `Chúng tôi xác nhận rằng yêu cầu hoàn tiền cho đơn hàng #${order._id} đã được xác nhận. Số tiền sẽ được hoàn trả đến quý khách trong thời gian sớm nhất. Cảm ơn quý khách !`,
        });
      } catch (error) {
        console.error("Error sending refund confirmation email:", error);
      }

      res.status(200).json({
        success: true,
        order,
        message: "Yêu cầu hoàn tiền đơn hàng thành công!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.put(
  "/order-refund-success/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);


      if (!order) {
        return next(
          new ErrorHandler("Không tìm thấy đơn đặt hàng với id này", 400)
        );
      }


      order.status = req.body.status;


     
      try {
        await sendMail({
          email: order.user.email,
          subject: "Hoàn tiền đơn hàng thành công",
          message: `Chúng tôi xác nhận rằng số tiền của đơn hàng #${order._id} đã được hoàn trả đến quý khách thành công. Cảm ơn quý khách rất nhiều.`,
        });
      } catch (error) {
        console.error("Error sending refund confirmation email:", error);
      }


      // Tính toán và trừ số tiền hoàn tiền khỏi doanh thu của cửa hàng
      const shopTotal = order.shopTotal;
      const refundAmount = calculateRefundAmount(shopTotal);


      // Kiểm tra xem số tiền hoàn lớn hơn số dư khả dụng của người bán không
      const seller = await Shop.findById(req.seller.id);
      if (refundAmount > seller.availableBalance) {
        return next(
          new ErrorHandler(
            "Số tiền hoàn lớn hơn số dư khả dụng của người bán.",
            400
          )
        );
      }
      await order.save();
      await updateSellerInfo(-refundAmount);


      // Hàm cập nhật thông tin cửa hàng
      async function updateSellerInfo(amount) {
        // Trừ số tiền hoàn tiền khỏi doanh thu của cửa hàng
        seller.availableBalance += amount;


        // Lưu thông tin cửa hàng sau khi cập nhật
        await seller.save();
      }


      // Hàm tính toán số tiền hoàn tiền từ shopTotal
      function calculateRefundAmount(shopTotal) {
        let refundAmount = 0;


        for (const shopId in shopTotal) {
          if (shopTotal.hasOwnProperty(shopId)) {
            const totalPrice = shopTotal[shopId].totalPrice;
            const discountedAmount = totalPrice - totalPrice * 0.05; // Giảm giá 5%
            refundAmount += discountedAmount;
          }
        }


        return refundAmount;
      }


      res.status(200).json({
        success: true,
        message: "Hoàn tiền đặt hàng thành công!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// all orders --- for admin
router.get(
  "/admin-all-orders",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find().sort({
        deliveredAt: -1,
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.get(
  "/get-order/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orderId = req.params.id;
      const order = await Order.findById(orderId);

      if (!order) {
        return next(new ErrorHandler("Order not found with this ID", 404));
      }

      // Check if the user has the permission to access this order
      if (
        req.user.role !== "Admin" &&
        (req.user.role !== "Seller" ||
          order.cart[0].seller.toString() !== req.user.id)
      ) {
        return next(new ErrorHandler("Unauthorized access to this order", 403));
      }

      res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
