import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { Model, isValidObjectId } from 'mongoose';
import { Pokemon } from './entities/pokemon.entity';
import { InjectModel } from '@nestjs/mongoose';
import { PokemonModule } from './pokemon.module';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PokemonService {

  private defaultlimit: number;

  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly configService: ConfigService,
  ) {

    this.defaultlimit = configService.get<number>('defaultlimit');

  }

  async create(createPokemonDto: CreatePokemonDto) {
    createPokemonDto.name = createPokemonDto.name.toLowerCase();

    //VALIDAR QUE NO HAYA UN REGISTRO IGUAL EN LA BD
    try {

      //INSERCIÓN
      const pokemon = await this.pokemonModel.create(createPokemonDto);
      return pokemon;

      //SI EXISTE ALGÚN ERROR, MOSTRAR CUÁL ES EL ERROR
    } catch (error) {
      //SE CREÓ LA FUNCIÓN DE ERROR HASTA ABAJO
      this.handleExceptions(error);
    }


  }

  findAll(paginationDto: PaginationDto) {
    
    const {limit = this.configService.get<number>('defaultlimit'), offset = 0} = paginationDto;
    return this.pokemonModel.find()
      .limit(limit)
      .skip(offset)
      .sort({
        no: 1 //Ordena la columna "no" de manera ascendente
      })
      .select('-__v');
  }

  async findOne(term: string) {

    let pokemon: Pokemon;

    if (!isNaN(+term)) {
      pokemon = await this.pokemonModel.findOne({ no: term });
    }

    //MONGO ID
    if (!pokemon && isValidObjectId(term)) {
      pokemon = await this.pokemonModel.findById(term)
    }

    //NAME
    if (!pokemon) {
      pokemon = await this.pokemonModel.findOne({ name: term.toLowerCase().trim() })
    }

    //Error en caso de que la búsqueda no regrese nada 
    if (!pokemon) throw new NotFoundException(`Pokemon with id, name or no "${term}" not found`)

    return pokemon;

  }

  async update(term: string, updatePokemonDto: UpdatePokemonDto) {

    //VALIDAR QUE NO HAYA UN REGISTRO IGUAL EN LA BD
    try {
      const pokemon = await this.findOne(term);

      if (updatePokemonDto.name)
        updatePokemonDto.name = updatePokemonDto.name.toLowerCase();

      const updatedPokemon = await pokemon.updateOne(updatePokemonDto);

      return { ...pokemon.toJSON(), ...updatePokemonDto };

    } catch (error) {
      //SE CREÓ LA FUNCIÓN DE ERROR HASTA ABAJO
      this.handleExceptions(error);
    }


  }

  async remove(id: string) {

    // const pokemon = await this.findOne(id);
    // await pokemon.deleteOne();
    
    // return {id};

    // const result = await this.pokemonModel.findByIdAndDelete(id);

    const {deletedCount} = await this.pokemonModel.deleteOne({_id: id})
    if(deletedCount === 0){
      throw new BadRequestException(`Pokemon with id "${id}" not found`);
    }
    return;

  }

  //ERROR DEFINIDO
  private handleExceptions(error:any){
    if (error.code === 11000) {
      throw new BadRequestException(`Pokemon existis in db ${JSON.stringify(error.keyValue)}`);
    }
    console.log(error);
    throw new InternalServerErrorException(`Cant create Pokemon, check server log`)
  }

}
