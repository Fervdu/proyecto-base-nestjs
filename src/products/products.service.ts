import { Injectable, InternalServerErrorException, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';

import { validate as isUUID } from 'uuid';
import { Product, ProductImage } from './entities';
import { query } from 'express';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource,
  ) {}


  async create(createProductDto: CreateProductDto, user: User) {
    
    try {

      const { images = [], ...productDetails } = createProductDto;

      const product = this.productRepository.create({
        ...productDetails,
        images: images.map( image => this.productImageRepository.create({ url: image }) ),
        user
      });

      await this.productRepository.save(product);

      return {...product, images};
      
    } catch (error) {
      
      this.handlerDBExceptions(error);
      
    }

  }

  
  async findAll(paginationDto: PaginationDto) {

    const { limit = 10, offset = 0} = paginationDto;

    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true,
      }
    });
    return products.map(product => ({
      ...product,
      images: product.images.map(image => image.url)
    }));

  }

  async findOne(term: string) {

    let product: Product;

    if(isUUID(term)) {
      // product = await this.productRepository.findOne({ where: { id: term } });
      product = await this.productRepository.findOneBy({id: term});
    } else {
      // product = await this.productRepository.findOne({ where: { slug: term } });
      const queryBuilder = this.productRepository.createQueryBuilder('prod');
      product = await queryBuilder.where('UPPER(title) =:title or slug =:slug', {
        title: term.toUpperCase(),
        slug: term.toLowerCase()
      })
      .leftJoinAndSelect('prod.images','prodImages')
      .getOne();

    }

    if(!product) {
      throw new NotFoundException(`Not found id ${term}`);
    }

    return product;

  }

  async findOnePlain(term: string) {
    const { images = [], ...res } = await this.findOne(term);

    return {
      ...res,
      images: images.map(image => image.url)
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {

    // const productUpdated = await this.productRepository.update(id,updateProductDto);

    // if(productUpdated.affected === 0) {
    //   throw new NotFoundException(`Not found id ${id}`);
    // }

    // const productUpdatedShow = await this.findOne(id);

    // return productUpdatedShow;

    const {images, ...updateData} = updateProductDto;

    const product = await this.productRepository.preload({
      id,
      ...updateData
    });

    if(!product) {
      throw new NotFoundException(`Not found id ${id}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      
      if(images) {
        await queryRunner.manager.delete(ProductImage, { product: {id} });

        product.images = images.map(
          image => this.productImageRepository.create({url: image})
        );

      }

      product.user = user;

      await queryRunner.manager.save(product);
      // await this.productRepository.save(product);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain(id);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.handlerDBExceptions(error);
    }


  }
  
  async remove(id: string) {

    const product = await this.findOne(id);

    const productDelete = await this.productRepository.remove(product)

    return productDelete;
  }

  private handlerDBExceptions(error: any) {
  
    this.logger.error(error);
    console.log(error);
  
    switch (error.code) {
      case '23505':
        
        throw new BadRequestException(error.detail);
        break;
    
      default:
        throw new InternalServerErrorException(`Unexpected error(${error.code}), ${error.detail}`);
        break;
    }
  
  }

  async deleteAllProducts() {

    const query = this.productRepository.createQueryBuilder('product');

    try {
      return await query
        .delete()
        .where({})
        .execute();
    } catch (error) {
      this.handlerDBExceptions(error);
    }

  }

}
