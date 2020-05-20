import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Product from '@modules/products/infra/typeorm/entities/Product';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IOrderProduct {
  product_id: string;
  quantity: number;
  price: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    const findProducts = await this.productsRepository.findAllById(products);

    if (products.length !== findProducts.length) {
      throw new AppError('Product not found');
    }

    const orderProducts = [] as IOrderProduct[];
    const updateProducts = [] as Product[];

    findProducts.forEach(_product => {
      const currentProduct = products.find(
        product => product.id === _product.id,
      );

      if (!currentProduct) {
        throw new AppError('Product not found');
      }

      if (currentProduct.quantity > _product.quantity) {
        throw new AppError('Product exceeded limit');
      }

      orderProducts.push({
        product_id: _product.id,
        price: _product.price,
        quantity: currentProduct.quantity,
      });

      updateProducts.push({
        ..._product,
        quantity: _product.quantity - currentProduct.quantity,
      });
    });

    await this.productsRepository.updateQuantity(updateProducts);

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    return order;
  }
}

export default CreateProductService;
